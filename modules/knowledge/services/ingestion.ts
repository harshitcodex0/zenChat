import { prisma } from '@/lib/db';
import { extractDocumentContent } from './extraction';
import { chunkText } from './chunking';
import { generateEmbeddings } from './embeddings';
import { Prisma } from '@prisma/client';

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
        const chunks = chunkText(rawText, { maxChunkSize: 1000, overlapSize: 200 });

        // 3. Generate Embeddings (batch them to avoid rate limits, or all at once if small enough)
        const embeddings = await generateEmbeddings(chunks);

        // 4. Save chunks and embeddings
        // We do this in a transaction or individual raw queries because of the Unsupported pgvector type
        for (let i = 0; i < chunks.length; i++) {
            const content = chunks[i];
            const embedding = embeddings[i];
            const embeddingString = `[${embedding.join(',')}]`;
            const chunkId = nanoid();

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

        // 5. Update document status
        await prisma.document.update({
            where: { id: document.id },
            data: { status: 'PROCESSED' }
        });

    } catch (error) {
        console.error(`Failed to process document ${documentId}:`, error);
        await prisma.document.update({
            where: { id: documentId },
            data: { status: 'ERROR' }
        });
        throw error;
    }
}
