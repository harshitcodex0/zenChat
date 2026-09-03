"use client";
import React, { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { IntegrationsDialog } from "@/modules/mcp/components/integrations-dialog";

import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { useAIModels } from "../../hooks/use-ai-models";
import { ModelSelector } from "./model-selector";
import { useCreateChat } from "../../hooks/use-chats";

export default function ChatMessageForm({ initialMessage, onMessageChange, selectedCharacterId }: { initialMessage?: string, onMessageChange?: (msg: string) => void, selectedCharacterId?: string | null }) {
    const { data: models, isPending } = useAIModels();
    const [message, setMessage] = useState("");
    const [userSelectedModel, setUserSelectedModel] = useState<string | null>(null);

    // Compute the actual selected model
    let selectedModel = userSelectedModel;
    if (!selectedModel && models?.models && models.models.length > 0) {
        // Find Gemini 3.7 Flash, fallback to Gemini Flash, then first model
        const geminiModel = models.models.find((m: { id: string, name: string }) => 
            m.name.toLowerCase().includes("gemini") && m.name.toLowerCase().includes("3.7") && m.name.toLowerCase().includes("flash")
        ) || models.models.find((m: { id: string, name: string }) => 
            m.name.toLowerCase().includes("gemini") && m.name.toLowerCase().includes("flash")
        );
        selectedModel = geminiModel?.id || models.models[0].id;
    }

    const setSelectedModel = (id: string) => setUserSelectedModel(id);

    const { mutateAsync, isPending: isChatPending } = useCreateChat();

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(()=>{
        if (initialMessage) {
            // eslint-disable-next-line
            setMessage(initialMessage);
            onMessageChange?.("");
        }
    },[initialMessage, onMessageChange])

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [selectedCharacterId]);

    const [attachedFiles, setAttachedFiles] = useState<{file: File, collectionId: string}[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            const { uploadChatAttachment } = await import('@/modules/knowledge/actions');
            const res = await uploadChatAttachment(formData);
            
            if (res.success && res.data) {
                setAttachedFiles(prev => [...prev, { file, collectionId: res.data.collectionId }]);
                toast.success("File attached to knowledge base");
            } else {
                toast.error(res.error || "Failed to attach file");
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Failed to attach file");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemoveFile = (collectionId: string) => {
        setAttachedFiles(prev => prev.filter(f => f.collectionId !== collectionId));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        try {
            e.preventDefault();
            if (!selectedModel) {
                toast.error("Please select a model first");
                return;
            }
            await mutateAsync({ 
                content: message, 
                model: selectedModel || "", 
                characterId: selectedCharacterId || undefined,
                knowledgeCollectionIds: attachedFiles.length > 0 ? attachedFiles.map(f => f.collectionId) : undefined
            });
            toast.success("Message sent successfully");
            setAttachedFiles([]);
        } catch (error) {
            console.error("Error sending message:", error);
            toast.error("Failed to send message");
        } finally {
            setMessage("");
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto px-4 pb-6">
            <form onSubmit={handleSubmit} className="relative">
                {/* Main Input Container */}
                <div className="relative rounded-2xl border border-border shadow-sm   transition-all">
                    {/* Textarea */}
                    <Textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={selectedCharacterId ? "Message your character..." : "Message ZenChat Base..."}
                        className="min-h-[60px] max-h-[200px] resize-none border-0 bg-transparent px-4 py-3 text-base focus-visible:ring-0 focus-visible:ring-offset-0 "
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e);
                            }
                        }}
                    />

                    {/* Toolbar */}
                    <div className="flex items-center justify-between gap-2 px-3 py-2 border-t ">
                        {/* Left side tools */}
                        <div className="flex items-center gap-1">
                            {isPending ? (
                                <>
                                    <Spinner />
                                </>
                            ) : (
                                <ModelSelector
                                    models={models?.models}
                                    selectedModelId={selectedModel}
                                    onModelSelect={setSelectedModel}
                                    className="ml-1"
                                />
                            )}
                            
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                onChange={handleFileChange} 
                                accept=".txt,.pdf,image/*,video/*"
                            />
                            
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="h-8 px-2 flex items-center gap-2 text-muted-foreground"
                            >
                                {isUploading ? <Spinner /> : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>}
                            </Button>
                            
                            <IntegrationsDialog>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 flex items-center gap-2 text-muted-foreground hover:text-foreground"
                                    title="Manage Integrations"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22v-5M9 8V2M15 8V2M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/></svg>
                                </Button>
                            </IntegrationsDialog>
                            {attachedFiles.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-1 bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-md max-w-[150px]">
                                    <span className="truncate">{item.file.name}</span>
                                    <button 
                                        type="button" 
                                        onClick={() => handleRemoveFile(item.collectionId)}
                                        className="text-muted-foreground hover:text-foreground ml-1"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            disabled={!message.trim()}
                            size="sm"
                            variant={message.trim() ? "default" : "ghost"}
                            className="h-8 w-8 p-0 rounded-full "
                            aria-label="Send message"
                            title={
                                message.trim() ? "Send message" : "Enter a message to enable"
                            }
                        >
                            {isChatPending ? (
                                <Spinner />
                            ) : (
                                <>
                                    <Send className="h-4 w-4" />
                                    <span className="sr-only">Send message</span>
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}