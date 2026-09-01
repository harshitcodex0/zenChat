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
        
        if (lastUserMsg && (lastUserMsg.content || lastUserMsg.parts)) {
            const collectionIds = [
                ...chat.knowledgeCollections.map(c => c.id),
                ...(chat.character?.knowledgeCollections?.map(c => c.id) || [])
            ];

            console.log(`[RAG] Chat ${chatId} has ${collectionIds.length} collections:`, collectionIds);

            if (collectionIds.length > 0) {
                // Perform Vector Search
                const { searchKnowledge } = await import('@/modules/knowledge/services/retrieval');
                try {
                    let userQuery = "";
                    if (Array.isArray(lastUserMsg.parts)) {
                        userQuery = lastUserMsg.parts.map((p: any) => p.text || "").join(" ");
                    } else if (Array.isArray(lastUserMsg.content)) {
                        userQuery = lastUserMsg.content.map((u: any) => u.text || "").join(" ");
                    } else if (typeof lastUserMsg.content === "string") {
                        try {
                            const parsed = JSON.parse(lastUserMsg.content);
                            if (Array.isArray(parsed)) {
                                userQuery = parsed.map((p: any) => p.text || "").join(" ");
                            } else {
                                userQuery = lastUserMsg.content;
                            }
                        } catch {
                            userQuery = lastUserMsg.content;
                        }
                    } else {
                        userQuery = String(lastUserMsg.content || "");
                    }
                    
                    const lowerQuery = userQuery.toLowerCase();
                    let intent: 'BROAD_SUMMARY' | 'SPECIFIC_QUESTION' | 'NUMERICAL' | 'SPECIFIC_SECTION' = 'SPECIFIC_QUESTION';
                    
                    if (/\b(summary|summarize|overview|brief|tell me about|what is this|what's this|main topics|key points)\b/.test(lowerQuery)) {
                        intent = 'BROAD_SUMMARY';
                    } else if (/\b(calculate|equation|number|numerical|table|figure|math|problem|solve|how many|percentage|how much)\b/.test(lowerQuery)) {
                        intent = 'NUMERICAL';
                    } else if (/\b(section|chapter|page|part)\b/.test(lowerQuery)) {
                        intent = 'SPECIFIC_SECTION';
                    }

                    console.log(`[RAG] Searching for: "${userQuery.slice(0, 80)}..." with intent ${intent}`);
                    const chunks = await searchKnowledge(userQuery, {
                        userId: user.id,
                        collectionIds,
                        topK: 5,
                        intent
                    });

                    console.log(`[RAG] Found ${chunks.length} relevant chunks`);

                    if (chunks.length > 0) {
                        const contextString = chunks.map((c, i) => {
                            let metaString = '';
                            if (c.metadata) {
                                if (c.metadata.page) metaString = `\nPage ${c.metadata.page}`;
                                else if (c.metadata.timestamp) metaString = `\n${c.metadata.timestamp}`;
                            }
                            // Guess emoji
                            let emoji = '📄';
                            const titleLower = c.documentTitle.toLowerCase();
                            if (titleLower.endsWith('.mp4') || titleLower.endsWith('.mov') || titleLower.endsWith('.mkv')) emoji = '🎥';
                            else if (titleLower.endsWith('.png') || titleLower.endsWith('.jpg') || titleLower.endsWith('.jpeg')) emoji = '🖼';
                            
                            return `[Source ${i + 1}: ${emoji} ${c.documentTitle}${metaString}]\n${c.content}\n`;
                        }).join("\n");
                        const { appendKnowledgeContext } = await import('@/lib/prompt');
                        systemPrompt = appendKnowledgeContext(systemPrompt, contextString, intent);
                        console.log(`[RAG] Injected ${chunks.length} chunks into system prompt (Intent: ${intent})`);
                    }
                } catch (error) {
                    console.error("[RAG] Retrieval error:", error);
                    // Non-fatal, continue with generation without context
                }
            } else {
                console.log(`[RAG] No collections linked to chat ${chatId}, skipping retrieval`);
            }
        }
        // ---------------------

        const { getActiveToolsForUser } = await import('@/modules/mcp/tools');
        const activeTools = await getActiveToolsForUser(user.id);

        const result = streamText({
            model: openRouter.chat(model),
            system: systemPrompt,
            messages: await convertToModelMessages(messages),
            tools: Object.keys(activeTools).length > 0 ? activeTools : undefined,
            maxSteps: 5,
        });

        result.consumeStream();

        return result.toUIMessageStreamResponse({
            sendReasoning: true,
            originalMessages: messages,
            generateMessageId,
            onFinish: async (event) => {
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

                    // @ts-ignore - handle newer AI SDK which provides responseMessages for multi-step
                    const msgs = event.responseMessages || (event.responseMessage ? [event.responseMessage] : []);
                    
                    for (const msg of msgs) {
                        if (msg?.parts?.length > 0) {
                            messageToSave.push({
                                id: msg.id || generateMessageId(),
                                chatId,
                                content: partsToJSON(msg),
                                messageRole: MessageRole.ASSISTANT,
                                messageType: "NORMAL",
                                model,
                            });
                        }
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


