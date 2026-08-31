import pdfParse from 'pdf-parse';

export async function extractText(buffer: Buffer): Promise<string> {
    return buffer.toString('utf-8');
}

export async function extractPDF(buffer: Buffer): Promise<string> {
    try {
        const data = await pdfParse(buffer);
        return data.text;
    } catch (error) {
        console.error("Error parsing PDF:", error);
        throw new Error("Failed to extract text from PDF");
    }
}

export async function extractMultimodal(buffer: Buffer, mimeType: string): Promise<string> {
    // Clean abstraction for future video/image support
    // In the future, this would call a vision model, OCR service, or audio transcription API
    return `[Mocked extraction for ${mimeType}. Full multimodal pipeline pending.]`;
}

export async function extractDocumentContent(buffer: Buffer, type: string, mimeType: string): Promise<string> {
    if (type === 'PDF' || mimeType === 'application/pdf') {
        return await extractPDF(buffer);
    } else if (type === 'TXT' || mimeType.startsWith('text/')) {
        return await extractText(buffer);
    } else if (type === 'IMAGE' || type === 'VIDEO' || mimeType.startsWith('image/') || mimeType.startsWith('video/')) {
        return await extractMultimodal(buffer, mimeType);
    }
    
    throw new Error(`Unsupported document type: ${type}`);
}
