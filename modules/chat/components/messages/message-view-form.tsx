"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useGetChatById } from "../../hooks/use-chats";
import { useAIModels } from "../../hooks/use-ai-models";
import { Spinner } from "@/components/ui/spinner";

import {
    PromptInput,
    PromptInputBody,
    PromptInputFooter,
    PromptInputMessage,
    PromptInputSubmit,
    PromptInputTextarea,
    PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
    Conversation,
    ConversationContent,
    ConversationEmptyState,
    ConversationScrollButton,
} from "@/components/ai-elements/conversation";

import { CharacterAvatar } from "@/components/character-avatar";
import { ModelSelector } from "../chat-view/model-selector";
import {
    Message,
    MessageContent,
    MessageResponse,
} from "@/components/ai-elements/message";
import {
    Reasoning,
    ReasoningContent,
    ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { toast } from "sonner";


import { CopyIcon, EditIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PromptInputProvider, usePromptInputController } from "@/components/ai-elements/prompt-input";

type MessagePartShape = {
    type: string;
    text?: string;
    [key: string]: unknown;
};

function parseMessageToUI(msg: { id: string, content: string, messageRole: string, createdAt: string | Date }) {
    const basePart = { type: "text", text: msg.content };
    const role = msg.messageRole.toLowerCase() as "user" | "assistant";

    try {
        const parts = JSON.parse(msg.content);
        return {
            id: msg.id,
            role,
            parts: Array.isArray(parts) ? parts : [basePart],
            createdAt: msg.createdAt,
        };
    } catch {
        return {
            id: msg.id,
            role,
            parts: [basePart],
            createdAt: msg.createdAt,
        };
    }
}

function MessagePart({ part, messageId, partIndex, role , isStreaming }:{
    part: MessagePartShape;
    messageId: string;
    partIndex: number;
    role: UIMessage["role"];
    isStreaming: boolean;
}) {
    const key = `${messageId}-${partIndex}`;
    const { textInput } = usePromptInputController();

    const handleCopy = () => {
        if (part.text) {
            navigator.clipboard.writeText(part.text);
            toast.success("Copied to clipboard");
        }
    };

    const handleEdit = () => {
        if (part.text) {
            textInput.setInput(part.text);
        }
    };

    if (part.type === "text") {
        return (
            <Message from={role} key={key}>
                <MessageContent>
                    <MessageResponse>{part.text}</MessageResponse>
                </MessageContent>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={handleCopy} className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground" title="Copy text">
                        <CopyIcon className="w-3 h-3" />
                    </Button>
                    {role === "user" && (
                        <Button variant="ghost" size="icon" onClick={handleEdit} className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground" title="Edit question">
                            <EditIcon className="w-3 h-3" />
                        </Button>
                    )}
                </div>
            </Message>
        );
    }

    if (part.type === "reasoning") {
        return (
            <Reasoning
                className="max-w-2xl px-4 py-4 border border-muted rounded-md bg-muted/50"
                key={key}
                isStreaming={isStreaming}
            >
                <ReasoningTrigger />
                <ReasoningContent className="mt-2 italic font-light text-muted-foreground">
                    {part.text ?? ""}
                </ReasoningContent>
            </Reasoning>
        );
    }

    if (part.type === "step-start" && partIndex > 0) {
        return (
            <div key={key} className="my-4 text-gray-500">
                <hr className="border-gray-300" />
            </div>
        );
    }

    return null;
}

export const MessageViewWithForm = ({ chatId }: {chatId:string}) => {
    const {data:chatData , isPending} = useGetChatById(chatId);

    if(isPending){
        return (
            <div className="flex items-center justify-center h-full">
                <Spinner/>
            </div>
        )
    }

    if(!chatData?.success || !chatData?.data){
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                Chat Not Found
            </div>
        )
    }

    const rawMessages = (chatData.data.messages ?? [])
    const initialMessages:UIMessage[] = rawMessages.filter((m: { id?: string, content?: string, messageRole: string, createdAt: string | Date })=>m?.id && m?.content?.trim())
        .map(m => parseMessageToUI(m as { id: string, content: string, messageRole: string, createdAt: string | Date }));

    return (
        <ChatView
            chatId={chatId}
            initialMessages={initialMessages}
            initialModel={chatData.data.model}
            character={chatData.data.character}
        />
    )
};

const ChatView = ({
                      chatId,
                      initialMessages,
                      initialModel,
                      character
                  }:{
    chatId: string;
    initialMessages: UIMessage[];
    initialModel: string | null;
    character: any;
})=>{
    const router = useRouter();
    const searchParams = useSearchParams();
    const shouldAutoTrigger = searchParams.get("autoTrigger") === "true";
    const hasAutoTriggered = useRef(false);

    const [selectedModel , setSelectedModel] = useState<string | null>(initialModel);
    const { data: modelsData, isPending: isModelLoading } = useAIModels();

    const transport = useMemo(
        () =>
            new DefaultChatTransport({
                api: "/api/chat",
            }),
        [],
    );

    const { messages, status, sendMessage, regenerate, stop, error } = useChat({
        id: chatId,
        messages: initialMessages,
        transport,
        onError: (err) => {
            console.log("Chat error", err);
            toast.error(err.message);
        },
    });


    const isBuzy = status === "submitted" || status === "streaming";


    useEffect(() => {
        if (!shouldAutoTrigger) return;
        if (hasAutoTriggered.current) return;
        if (!selectedModel) return;
        if (messages.length === 0) return;
        if (messages.at(-1)?.role !== "user") return;

        hasAutoTriggered.current = true;

        regenerate({
            body: {
                chatId,
                model: selectedModel,
                skipUserMessage: true,
            },
        }).catch((err) => {
            console.error("Auto-trigger failed:", err);
            toast.error("Failed to generate response");
        });

        const params = new URLSearchParams(searchParams.toString());
        params.delete("autoTrigger");
        const query = params.toString();
        router.replace(`/chat/${chatId}${query ? `?${query}` : ""}`, {
            scroll: false,
        });
    }, [
        shouldAutoTrigger,
        selectedModel,
        messages,
        chatId,
        regenerate,
        router,
        searchParams,
    ]);


    const handleSubmit = async(message:PromptInputMessage)=>{
        const text = message.text?.trim();
        if(!text) return;
        if(!selectedModel){
            toast.error("Please select a model first")
        }

        if(isBuzy) return;

        try {
            await sendMessage(
                {text},
                {
                    body:{
                        chatId,
                        model:selectedModel,
                        skipUserMessage:false
                    }
                }
            )
        } catch (error) {
            console.error("Send message failed:", error);
            toast.error("Failed to send message");
        }
    }


    return (
        <PromptInputProvider>
            <div className="max-w-4xl mx-auto p-6 relative size-full h-[calc(100vh-4rem)]">
            <div className="flex flex-col h-full">
                
                {/* Character Header */}
                {character && (
                    <div className="flex items-center gap-3 pb-4 mb-4 border-b">
                        <CharacterAvatar name={character.name} src={character.avatar} size="lg" />
                        <div>
                            <h2 className="font-semibold text-lg">{character.name}</h2>
                            <p className="text-sm text-muted-foreground">{character.description}</p>
                        </div>
                    </div>
                )}

                <Conversation className="h-full">
                    <ConversationContent>
                        {messages.length === 0 ? (
                            <ConversationEmptyState
                                title="Start the conversation"
                                description="Send a message to get started."
                            />
                        ) : (
                            messages.map((message) => (
                                <Fragment key={message.id}>
                                    {message.parts.map((part, i) => (
                                        <MessagePart
                                            key={`${message.id}-${i}`}
                                            part={part as MessagePartShape}
                                            messageId={message.id}
                                            partIndex={i}
                                            role={message.role}
                                            isStreaming={
                                                isBuzy &&
                                                message === messages.at(-1) &&
                                                i === message.parts.length - 1
                                            }
                                        />
                                    ))}
                                </Fragment>
                            ))
                        )}

                        {status === "submitted" && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Spinner />
                                <span className="text-sm">AI is thinking...</span>
                            </div>
                        )}

                        {error && (
                            <div className="text-sm text-destructive">
                                {error.message || "Something went wrong."}
                            </div>
                        )}
                    </ConversationContent>
                    <ConversationScrollButton />
                </Conversation>

                <PromptInput onSubmit={handleSubmit} className="mt-4">
                    <PromptInputBody>
                        <PromptInputTextarea
                            placeholder="Type your message..."
                            disabled={isBuzy}
                        />
                    </PromptInputBody>

                    <PromptInputFooter>
                        <PromptInputTools className="flex items-center justify-between gap-2 w-full">
                            <div className="flex-1">
                                {isModelLoading ? (
                                    <Spinner />
                                ) : (
                                    <ModelSelector
                                        models={modelsData?.models ?? []}
                                        selectedModelId={selectedModel}
                                        onModelSelect={setSelectedModel}
                                        className=""
                                    />
                                )}
                            </div>
                            <PromptInputSubmit status={status} onStop={stop} />
                        </PromptInputTools>
                    </PromptInputFooter>
                </PromptInput>
            </div>
        </div>
        </PromptInputProvider>
    )
}