import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export interface StorageService {
    uploadAvatar(fileBuffer: Buffer, fileName: string, contentType: string): Promise<string>;
    deleteAvatar(fileUrl: string): Promise<void>;
    uploadDocument(fileBuffer: Buffer, fileName: string, contentType: string): Promise<string>;
}

export class LocalStorageService implements StorageService {
    private readonly uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');

    constructor() {
        // Ensure directory exists
        fs.mkdir(this.uploadDir, { recursive: true }).catch(console.error);
    }

    async uploadAvatar(fileBuffer: Buffer, fileName: string, contentType: string): Promise<string> {
        // Basic validation
        const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
        if (!allowedTypes.includes(contentType)) {
            throw new Error('Invalid file type');
        }

        // Sanitize SVG
        if (contentType === 'image/svg+xml') {
            const contentString = fileBuffer.toString('utf-8');
            if (contentString.includes('<script') || contentString.includes('onload')) {
                throw new Error('Unsafe SVG content detected');
            }
        }

        // Generate safe unique filename
        const ext = path.extname(fileName) || (contentType === 'image/jpeg' ? '.jpg' : contentType === 'image/png' ? '.png' : '.svg');
        const uniqueId = crypto.randomBytes(16).toString('hex');
        const safeName = `${uniqueId}${ext}`;
        
        const filePath = path.join(this.uploadDir, safeName);
        await fs.writeFile(filePath, fileBuffer);
        
        return `/uploads/avatars/${safeName}`;
    }

    async deleteAvatar(fileUrl: string): Promise<void> {
        if (!fileUrl.startsWith('/uploads/avatars/')) return;
        const fileName = path.basename(fileUrl);
        const filePath = path.join(this.uploadDir, fileName);
        try {
            await fs.unlink(filePath);
        } catch (error) {
            console.error('Failed to delete avatar file:', error);
        }
    }
    async uploadDocument(fileBuffer: Buffer, fileName: string, contentType: string): Promise<string> {
        const ext = path.extname(fileName) || '';
        const uniqueId = crypto.randomBytes(16).toString('hex');
        const safeName = `doc-${uniqueId}${ext}`;
        
        const docDir = path.join(process.cwd(), 'public', 'uploads', 'documents');
        await fs.mkdir(docDir, { recursive: true }).catch(console.error);

        const filePath = path.join(docDir, safeName);
        await fs.writeFile(filePath, fileBuffer);
        
        return `/uploads/documents/${safeName}`;
    }
}

// Factory to get storage
export function getStorageService(): LocalStorageService {
    return new LocalStorageService();
}
