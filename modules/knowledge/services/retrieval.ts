import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { generateEmbedding } from './embeddings';

export interface RetrievalOptions {
    userId: string;
    collectionIds?: string[];
    topK?: number;
    threshold?: number;
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
 * Enforces strict ownership or explicit collection access.
 */
export async function searchKnowledge(query: string, options: RetrievalOptions): Promise<RetrievedChunk[]> {
    const { userId, collectionIds, topK = 5, threshold = 0.5 } = options;
    
    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query);
    const embeddingString = `[${queryEmbedding.join(',')}]`;

    let results: any[];

    if (collectionIds && collectionIds.length > 0) {
        // Search strictly within specified collections owned by the user
        results = await prisma.$queryRaw`
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
              AND 1 - (dc.embedding <=> ${embeddingString}::vector) > ${threshold}
            ORDER BY dc.embedding <=> ${embeddingString}::vector
            LIMIT ${topK}
        `;
    } else {
        // Search across all the user's collections
        results = await prisma.$queryRaw`
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
              AND 1 - (dc.embedding <=> ${embeddingString}::vector) > ${threshold}
            ORDER BY dc.embedding <=> ${embeddingString}::vector
            LIMIT ${topK}
        `;
    }

    return results.map(row => ({
        id: row.id,
        documentId: row.documentId,
        content: row.content,
        metadata: row.metadata,
        similarity: Number(row.similarity),
        documentTitle: row.documentTitle,
    }));
}
