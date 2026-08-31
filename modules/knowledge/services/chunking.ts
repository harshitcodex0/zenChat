export interface ChunkOptions {
    maxChunkSize?: number;
    overlapSize?: number;

}

export interface DocumentChunkResult {
    text: string;
    metadata?: any;
}

export function chunkText(text: string, options?: ChunkOptions): DocumentChunkResult[] {
    const maxChunkSize = options?.maxChunkSize || 1000;
    const overlapSize = options?.overlapSize || 200;

    // Check if the text contains page boundaries
    const pageChunks: { text: string; page: number }[] = [];
    const pageBoundaryRegex = /---PAGE_BOUNDARY_(\d+)---/g;
    
    let lastIndex = 0;
    let match;
    let currentPage = 1;

    while ((match = pageBoundaryRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            pageChunks.push({
                text: text.slice(lastIndex, match.index).trim(),
                page: currentPage
            });
        }
        currentPage = parseInt(match[1], 10);
        lastIndex = pageBoundaryRegex.lastIndex;
    }
    
    if (lastIndex < text.length) {
        pageChunks.push({
            text: text.slice(lastIndex).trim(),
            page: currentPage
        });
    }

    const chunks: DocumentChunkResult[] = [];

    // Chunk each page separately to avoid cross-page chunks losing page context
    for (const pageChunk of pageChunks) {
        if (!pageChunk.text) continue;
        
        const words = pageChunk.text.split(/\s+/);
        let currentChunkWords: string[] = [];
        let currentLength = 0;

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const wordLength = word.length + 1; // +1 for space

            if (currentLength + wordLength > maxChunkSize && currentChunkWords.length > 0) {
                chunks.push({
                    text: currentChunkWords.join(' '),
                    metadata: { page: pageChunk.page }
                });
                
                // Calculate overlap
                let overlapLength = 0;
                const overlapWords: string[] = [];
                for (let j = currentChunkWords.length - 1; j >= 0; j--) {
                    const w = currentChunkWords[j];
                    if (overlapLength + w.length + 1 > overlapSize) break;
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
            chunks.push({
                text: currentChunkWords.join(' '),
                metadata: { page: pageChunk.page }
            });
        }
    }

    return chunks;
}
