export interface ChunkOptions {
    maxChunkSize?: number;
    overlapSize?: number;
}

export function chunkText(text: string, options?: ChunkOptions): string[] {
    const maxChunkSize = options?.maxChunkSize || 1000;
    const overlapSize = options?.overlapSize || 200;

    // Simple word-based chunker for now to respect basic boundaries
    const words = text.split(/\s+/);
    const chunks: string[] = [];

    let currentChunkWords: string[] = [];
    let currentLength = 0;

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const wordLength = word.length + 1; // +1 for space

        if (currentLength + wordLength > maxChunkSize && currentChunkWords.length > 0) {
            chunks.push(currentChunkWords.join(' '));
            
            // Calculate overlap by taking words from the end of the current chunk
            let overlapLength = 0;
            const overlapWords: string[] = [];
            
            for (let j = currentChunkWords.length - 1; j >= 0; j--) {
                const w = currentChunkWords[j];
                if (overlapLength + w.length + 1 > overlapSize) {
                    break;
                }
                overlapWords.unshift(w);
                overlapLength += w.length + 1;
            }

            currentChunkWords = [...overlapWords];
            currentLength = overlapLength;
        }

        currentChunkWords.push(word);
        currentLength += wordLength;
    }

    if (currentChunkWords.length > 0) {
        chunks.push(currentChunkWords.join(' '));
    }

    return chunks;
}
