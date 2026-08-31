import { embed, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';

/**
 * Generates an embedding for a single chunk of text.
 * Requires OPENAI_API_KEY environment variable.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const { embedding } = await embed({
            model: openai.embedding('text-embedding-3-small'),
            value: text,
        });
        return embedding;
    } catch (error) {
        console.error("Error generating embedding:", error);
        throw new Error("Failed to generate embedding");
    }
}

/**
 * Generates embeddings for multiple chunks of text.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
        const { embeddings } = await embedMany({
            model: openai.embedding('text-embedding-3-small'),
            values: texts,
        });
        return embeddings;
    } catch (error) {
        console.error("Error generating embeddings in batch:", error);
        throw new Error("Failed to generate embeddings in batch");
    }
}
