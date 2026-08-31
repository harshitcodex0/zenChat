import { convertToModelMessages, streamText , createIdGenerator , type UIMessage } from "ai";
import { generateSystemPrompt } from "@/lib/prompt";
import { prisma } from "@/lib/db";
import { MessageRole } from "@/lib/generated/prisma/enums";
import { currentUser } from "@/modules/authentication/actions";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { NextRequest } from "next/server";

const openRouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY!,
});

const generateMessageId = createIdGenerator({prefix:"msg" , size:16})

/**
 * Convert message parts to JSON string for DB storage
 */
function partsToJSON(message: { parts?: unknown; content?: string }) {
    if (Array.isArray(message.parts)) {
        return JSON.stringify(message.parts);
    }
    return JSON.stringify([{ type: "text", text: message.content ?? "" }]);
}



export async function POST(req: NextRequest) {
    try {
        const user = await currentUser();
        if (!user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const {
            chatId,
            messages,
            model,
            skipUserMessage,
        } = await req.json();

        const chat = await prisma.chat.findUnique({
            where: { id: chatId, userId: user.id },
            include: { 
                character: {
                    include: { knowledgeCollections: { select: { id: true } } }
                },
                knowledgeCollections: { select: { id: true } }
            }
        });

        if (!chat) {
            return Response.json({ error: "Chat not found" }, { status: 404 });
        }

        let systemPrompt = generateSystemPrompt(chat.character);

        // --- RAG RETRIEVAL ---
        const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
        
        if (lastUserMsg && lastUserMsg.content) {
            const collectionIds = [
                ...chat.knowledgeCollections.map(c => c.id),
                ...(chat.character?.knowledgeCollections?.map(c => c.id) || [])
            ];

            if (collectionIds.length > 0) {
                // Perform Vector Search
                const { searchKnowledge } = await import('@/modules/knowledge/services/retrieval');
                try {
                    let userQuery = lastUserMsg.content;
                    if (Array.isArray(userQuery)) {
                        userQuery = userQuery.map(u => u.text || "").join(" ");
                    }
                    
                    const chunks = await searchKnowledge(userQuery, {
                        userId: user.id,
                        collectionIds,
                        topK: 5
                    });

                    if (chunks.length > 0) {
                        const contextString = chunks.map((c, i) => `[Source ${i + 1}: ${c.documentTitle}]\n${c.content}\n`).join("\n");
                        const { appendKnowledgeContext } = await import('@/lib/prompt');
                        systemPrompt = appendKnowledgeContext(systemPrompt, contextString);
                    }
                } catch (error) {
                    console.error("RAG Retrieval error:", error);
                    // Non-fatal, continue with generation without context
                }
            }
        }
        // ---------------------

        const result = streamText({
            model: openRouter.chat(model),
            system: systemPrompt,
            messages: await convertToModelMessages(messages),
        });

        result.consumeStream();

        return result.toUIMessageStreamResponse({
            sendReasoning: true,
            originalMessages: messages,
            generateMessageId,
            onFinish: async ({ responseMessage }) => {
                try {
                    const messageToSave:Array<{
                        id?: string;
                        chatId: string;
                        content: string;
                        messageRole: MessageRole;
                        messageType: "NORMAL";
                        model: string;
                    }> = [];

                    if (!skipUserMessage) {
                        const lastUserMsg = [...messages]
                            .reverse()
                            .find((m) => m.role === "user");
                        if (lastUserMsg) {
                            messageToSave.push({
                                id:lastUserMsg.id,
                                chatId,
                                content: partsToJSON(lastUserMsg),
                                messageRole: MessageRole.USER,
                                messageType: "NORMAL",
                                model,
                            });
                        }
                    }

                    if (responseMessage?.parts?.length > 0) {
                        messageToSave.push({
                            id:responseMessage.id,
                            chatId,
                            content: partsToJSON(responseMessage),
                            messageRole: MessageRole.ASSISTANT,
                            messageType: "NORMAL",
                            model,
                        });
                    }

                    if(messageToSave.length > 0){
                        await prisma.message.createMany({data:messageToSave , skipDuplicates:true})
                    }
                } catch (error) {
                    console.error("Error saving messages" , error)
                }
            },
        });
    } catch (error) {
        console.error("Chat API error:", error);
        return Response.json(
            { error: (error as Error).message || "Internal server error" },
            { status: 500 }
        );
    }
}

