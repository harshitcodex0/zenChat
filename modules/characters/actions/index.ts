"use server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/modules/authentication/actions";
import { revalidatePath } from "next/cache";

export async function getCharacters() {
    try {
        console.log("getCharacters() called");
        const user = await currentUser();
        console.log("getCharacters() user:", user?.id);
        if (!user) {
            return { success: false, message: "Unauthorized" };
        }

        // Fetch user's characters AND default characters
        const characters = await prisma.character.findMany({
            where: {
                OR: [
                    { isDefault: true },
                    { creatorId: user.id }
                ]
            },
            orderBy: [
                { isDefault: 'desc' },
                { createdAt: 'desc' }
            ]
        });

        return { success: true, data: characters };
    } catch (error) {
        console.error("Error fetching characters:", error);
        return { success: false, message: "Failed to fetch characters" };
    }
}

export async function getCharacterById(id: string) {
    try {
        const user = await currentUser();
        if (!user) {
            return { success: false, message: "Unauthorized" };
        }

        const character = await prisma.character.findUnique({
            where: { id }
        });

        if (!character) {
            return { success: false, message: "Character not found" };
        }

        // Security check: Only allow if it's default or owned by user or public (if implemented later)
        if (!character.isDefault && character.creatorId !== user.id && character.visibility === "PRIVATE") {
            return { success: false, message: "Unauthorized access to character" };
        }

        return { success: true, data: character };
    } catch (error) {
        console.error("Error fetching character:", error);
        return { success: false, message: "Failed to fetch character" };
    }
}

interface CreateCharacterInput {
    name: string;
    description: string;
    personality?: string;
    background?: string;
    speakingStyle?: string;
    interests?: string;
    behaviorInstructions?: string;
    systemPrompt?: string;
    avatar?: string;
    visibility?: string;
}

export async function createCharacter(data: CreateCharacterInput) {
    try {
        const user = await currentUser();
        if (!user) {
            return { success: false, message: "Unauthorized" };
        }

        if (!data.name || !data.description) {
            return { success: false, message: "Name and description are required" };
        }

        const character = await prisma.character.create({
            data: {
                ...data,
                creatorId: user.id,
                isDefault: false, // Security: force user created characters to not be default
            }
        });

        revalidatePath("/characters");
        return { success: true, data: character };
    } catch (error) {
        console.error("Error creating character:", error);
        return { success: false, message: "Failed to create character" };
    }
}

export async function updateCharacter(id: string, data: Partial<CreateCharacterInput>) {
    try {
        const user = await currentUser();
        if (!user) {
            return { success: false, message: "Unauthorized" };
        }

        // Check ownership
        const existing = await prisma.character.findUnique({ where: { id } });
        if (!existing) {
            return { success: false, message: "Character not found" };
        }

        if (existing.isDefault) {
            return { success: false, message: "Cannot edit default characters" };
        }

        if (existing.creatorId !== user.id) {
            return { success: false, message: "Unauthorized to edit this character" };
        }

        const character = await prisma.character.update({
            where: { id },
            data: {
                ...data,
                isDefault: false, // Security check
                creatorId: user.id // Security check
            }
        });

        revalidatePath("/characters");
        return { success: true, data: character };
    } catch (error) {
        console.error("Error updating character:", error);
        return { success: false, message: "Failed to update character" };
    }
}

export async function deleteCharacter(id: string) {
    try {
        const user = await currentUser();
        if (!user) {
            return { success: false, message: "Unauthorized" };
        }

        // Check ownership
        const existing = await prisma.character.findUnique({ where: { id } });
        if (!existing) {
            return { success: false, message: "Character not found" };
        }

        if (existing.isDefault) {
            return { success: false, message: "Cannot delete default characters" };
        }

        if (existing.creatorId !== user.id) {
            return { success: false, message: "Unauthorized to delete this character" };
        }

        await prisma.character.delete({
            where: { id }
        });
        
        // Note: Chat characterId will become null due to SetNull in Prisma schema.

        revalidatePath("/characters");
        return { success: true };
    } catch (error) {
        console.error("Error deleting character:", error);
        return { success: false, message: "Failed to delete character" };
    }
}
