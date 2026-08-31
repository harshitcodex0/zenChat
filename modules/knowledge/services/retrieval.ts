import { prisma } from '@/lib/db';
import { Prisma } from '@/lib/generated/prisma/client';
import { generateEmbedding } from './embeddings';

export interface RetrievalOptions {
    userId: string;
    collectionIds?: string[];
    topK?: number;
    intent?: 'BROAD_SUMMARY' | 'SPECIFIC_QUESTION' | 'NUMERICAL' | 'SPECIFIC_SECTION';
}

export interface RetrievedChunk {
    id: string;
    documentId: string;
    content: string;
    metadata: any;
    similarity: number;
    documentTitle: string;
}

/**
 * Searches the vector database for chunks similar to the query.
 * Adapts retrieval strategy based on the user's intent.
 */
export async function searchKnowledge(query: string, options: RetrievalOptions): Promise<RetrievedChunk[]> {
    const { userId, collectionIds, intent = 'SPECIFIC_QUESTION' } = options;
    let { topK = 5 } = options;
    
    // Adjust topK based on intent
    if (intent === 'NUMERICAL' || intent === 'SPECIFIC_SECTION') {
        topK = 10; // Retrieve more context for complex or specific data
    }

    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query);
    const embeddingString = `[${queryEmbedding.join(',')}]`;

    let results: any[] = [];

    if (collectionIds && collectionIds.length > 0) {
        if (intent === 'BROAD_SUMMARY') {
            // For broad summaries, we fetch all chunks ordered by ID (chronological/sequential)
            // and sample them uniformly to give a representative overview of the whole document.
            const allChunks = await prisma.$queryRaw<any[]>`
                SELECT 
                    dc.id, 
                    dc."documentId", 
                    dc.content, 
                    dc.metadata,
                    d.title as "documentTitle",
                    1 - (dc.embedding <=> ${embeddingString}::vector) as similarity
                FROM document_chunk dc
                JOIN document d ON dc."documentId" = d.id
                JOIN knowledge_collection kc ON d."collectionId" = kc.id
                WHERE kc.id IN (${Prisma.join(collectionIds)}) 
                  AND kc."userId" = ${userId}
                ORDER BY dc.id ASC
            `;
            
            const targetChunks = 8;
            if (allChunks.length <= targetChunks) {
                results = allChunks;
            } else {
                const step = allChunks.length / targetChunks;
                for (let i = 0; i < targetChunks; i++) {
                    results.push(allChunks[Math.floor(i * step)]);
                }
            }
        } else {
            // Standard semantic vector search for specific questions
            results = await prisma.$queryRaw<any[]>`
                SELECT 
                    dc.id, 
                    dc."documentId", 
                    dc.content, 
                    dc.metadata,
                    d.title as "documentTitle",
                    1 - (dc.embedding <=> ${embeddingString}::vector) as similarity
                FROM document_chunk dc
                JOIN document d ON dc."documentId" = d.id
                JOIN knowledge_collection kc ON d."collectionId" = kc.id
                WHERE kc.id IN (${Prisma.join(collectionIds)}) 
                  AND kc."userId" = ${userId}
                ORDER BY dc.embedding <=> ${embeddingString}::vector
                LIMIT ${topK}
            `;
        }
    } else {
        // Fallback for all collections (rarely used in chat context)
        results = await prisma.$queryRaw<any[]>`
            SELECT 
                dc.id, 
                dc."documentId", 
                dc.content, 
                dc.metadata,
                d.title as "documentTitle",
                1 - (dc.embedding <=> ${embeddingString}::vector) as similarity
            FROM document_chunk dc
            JOIN document d ON dc."documentId" = d.id
            JOIN knowledge_collection kc ON d."collectionId" = kc.id
            WHERE kc."userId" = ${userId}
            ORDER BY dc.embedding <=> ${embeddingString}::vector
            LIMIT ${topK}
        `;
    }

    console.log(`[RAG retrieval] Found ${results.length} chunks, top similarity: ${results[0] ? Number(results[0].similarity).toFixed(3) : 'N/A'}`);

    return results.map(row => ({
        id: row.id,
        documentId: row.documentId,
        content: row.content,
        metadata: row.metadata,
        similarity: Number(row.similarity),
        documentTitle: row.documentTitle,
    }));
}
