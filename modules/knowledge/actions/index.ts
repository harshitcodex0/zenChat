"use server";

import { prisma } from "@/lib/db";
import { currentUser } from "@/modules/authentication/actions";
import { processDocument } from "../services/ingestion";
import { LocalStorageService } from "@/lib/storage";

export async function getCollections() {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const collections = await prisma.knowledgeCollection.findMany({
        where: { userId: user.id },
        include: { _count: { select: { documents: true } } },
        orderBy: { updatedAt: 'desc' }
    });

    return { success: true, data: collections };
}

export async function createCollection(name: string, description?: string) {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const collection = await prisma.knowledgeCollection.create({
        data: {
            name,
            description,
            userId: user.id
        }
    });

    return { success: true, data: collection };
}

export async function deleteCollection(id: string) {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const collection = await prisma.knowledgeCollection.findUnique({ where: { id } });
    if (!collection || collection.userId !== user.id) {
        return { success: false, error: "Not found or unauthorized" };
    }

    await prisma.knowledgeCollection.delete({ where: { id } });
    return { success: true };
}

export async function getDocuments(collectionId: string) {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const documents = await prisma.document.findMany({
        where: { collectionId, userId: user.id },
        orderBy: { createdAt: 'desc' }
    });

    return { success: true, data: documents };
}

export async function uploadDocument(collectionId: string, formData: FormData) {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const collection = await prisma.knowledgeCollection.findUnique({ where: { id: collectionId } });
    if (!collection || collection.userId !== user.id) {
        return { success: false, error: "Not found or unauthorized" };
    }

    const file = formData.get("file") as File;
    if (!file) {
        return { success: false, error: "No file provided" };
    }

    const storage = new LocalStorageService();
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await storage.uploadDocument(buffer, file.name, file.type);

    let type: 'TXT' | 'PDF' | 'IMAGE' | 'VIDEO' = 'TXT';
    if (file.type.includes('pdf')) type = 'PDF';
    else if (file.type.includes('image')) type = 'IMAGE';
    else if (file.type.includes('video')) type = 'VIDEO';

    const document = await prisma.document.create({
        data: {
            title: file.name,
            url,
            type,
            status: 'PENDING',
            collectionId,
            userId: user.id
        }
    });

    try {
        await processDocument(document.id, buffer, file.type);
    } catch (e) {
        console.error("Process error:", e);
        return { success: false, error: "Failed to process document" };
    }

    return { success: true, data: document };
}

export async function deleteDocument(id: string) {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const document = await prisma.document.findUnique({ where: { id } });
    if (!document || document.userId !== user.id) {
        return { success: false, error: "Not found or unauthorized" };
    }

    await prisma.document.delete({ where: { id } });
    return { success: true };
}

export async function uploadChatAttachment(formData: FormData) {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // Find or create "Chat Attachments" collection
    let collection = await prisma.knowledgeCollection.findFirst({
        where: { userId: user.id, name: "Chat Attachments" }
    });

    if (!collection) {
        collection = await prisma.knowledgeCollection.create({
            data: { name: "Chat Attachments", description: "Direct attachments from chats", userId: user.id }
        });
    }

    const file = formData.get("file") as File;
    if (!file) return { success: false, error: "No file provided" };

    const storage = new LocalStorageService();
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await storage.uploadDocument(buffer, file.name, file.type);

    let type: 'TXT' | 'PDF' | 'IMAGE' | 'VIDEO' = 'TXT';
    if (file.type.includes('pdf')) type = 'PDF';
    else if (file.type.includes('image')) type = 'IMAGE';
    else if (file.type.includes('video')) type = 'VIDEO';

    const document = await prisma.document.create({
        data: {
            title: file.name,
            url,
            type,
            status: 'PENDING',
            collectionId: collection.id,
            userId: user.id
        }
    });

    try {
        await processDocument(document.id, buffer, file.type);
    } catch (e) {
        console.error("Process error:", e);
        return { success: false, error: "Failed to process document" };
    }

    return { success: true, data: { document, collectionId: collection.id } };
}
