import { prisma } from '@/lib/db';
import { extractDocumentContent } from './extraction';
import { chunkText } from './chunking';
import { generateEmbeddings } from './embeddings';
import { Prisma } from '@/lib/generated/prisma/client';

import { nanoid } from 'nanoid';

export async function processDocument(documentId: string, buffer: Buffer, mimeType: string) {
    try {
        const document = await prisma.document.update({
            where: { id: documentId },
            data: { status: 'PROCESSING' }
        });

        // 1. Extract text based on file type
        const rawText = await extractDocumentContent(buffer, document.type, mimeType);

        if (!rawText || rawText.trim() === '') {
            throw new Error("No text could be extracted from the document");
        }

        // 2. Chunk text
        const chunkResults = chunkText(rawText, { maxChunkSize: 1000, overlapSize: 200 });
        const texts = chunkResults.map(c => c.text);

        // 3. Generate Embeddings (batch them to avoid rate limits, or all at once if small enough)
        const embeddings = await generateEmbeddings(texts);

        // 4. Save chunks and embeddings
        // We do this in a transaction or individual raw queries because of the Unsupported pgvector type
        for (let i = 0; i < chunkResults.length; i++) {
            const content = chunkResults[i].text;
            const metadata = chunkResults[i].metadata;
            const metadataJson = metadata ? JSON.stringify(metadata) : null;
            const embedding = embeddings[i];
            const embeddingString = `[${embedding.join(',')}]`;
            const chunkId = nanoid();

            if (metadataJson) {
                await prisma.$executeRaw`
                    INSERT INTO document_chunk ("id", "documentId", "content", "metadata", "embedding")
                    VALUES (
                        ${chunkId}, 
                        ${document.id}, 
                        ${content}, 
                        ${metadataJson}::jsonb,
                        ${embeddingString}::vector
                    )
                `;
            } else {
                await prisma.$executeRaw`
                    INSERT INTO document_chunk ("id", "documentId", "content", "embedding")
                    VALUES (
                        ${chunkId}, 
                        ${document.id}, 
                        ${content}, 
                        ${embeddingString}::vector
                    )
                `;
            }
        }

        // 5. Update document status
        await prisma.document.update({
            where: { id: document.id },
            data: { status: 'PROCESSED' }
        });

    } catch (error: any) {
        console.error(`Failed to process document ${documentId}:`, error);
        
        let errorMessage = "Unknown processing error";
        if (!process.env.OPENROUTER_API_KEY) {
            errorMessage = "OpenRouter API key is missing. Please add OPENROUTER_API_KEY to your .env file.";
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }

        await prisma.document.update({
            where: { id: documentId },
            data: { status: 'ERROR' }
        });
        
        throw new Error(errorMessage);
    }
}
