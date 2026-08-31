"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createCharacter } from "../actions";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { CharacterAvatar } from "@/components/character-avatar";

export function CharacterFormModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Form state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [personality, setPersonality] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetForm = () => {
        setName("");
        setDescription("");
        setPersonality("");
        setAvatarUrl(null);
    };

    const handleOpenChange = (newOpen: boolean) => {
        onOpenChange(newOpen);
        if (!newOpen) {
            resetForm();
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/api/upload/avatar", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Failed to upload avatar");
            }

            setAvatarUrl(data.url);
            toast.success("Avatar uploaded successfully");
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await createCharacter({
                name,
                description,
                personality,
                avatar: avatarUrl || undefined,
                visibility: "PRIVATE"
            });

            if (res.success) {
                toast.success("Character created!");
                setOpen(false);
                resetForm();
                // We'd ideally invalidate the query so the character selector updates.
                // We can just trigger a window reload or rely on revalidatePath
                window.location.reload(); 
            } else {
                toast.error(res.message || "Failed to create character");
            }
        } catch (error) {
            console.error(error);
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create Character</DialogTitle>
                    <DialogDescription>
                        Design a new AI persona to chat with.
                    </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="flex flex-col items-center space-y-2 mb-4">
                        <CharacterAvatar name={name || "New"} src={avatarUrl} size="xl" />
                        <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.svg"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleAvatarUpload}
                        />
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            disabled={uploading}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {uploading ? "Uploading..." : "Upload Avatar"}
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Name</label>
                        <Input 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            placeholder="e.g. Yoda" 
                            required 
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Tagline / Description</label>
                        <Input 
                            value={description} 
                            onChange={(e) => setDescription(e.target.value)} 
                            placeholder="e.g. Wise Jedi Master" 
                            required 
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Personality & Behavior</label>
                        <Textarea 
                            value={personality} 
                            onChange={(e) => setPersonality(e.target.value)} 
                            placeholder="Describe how they should act, talk, and behave..." 
                            className="resize-none"
                            rows={4}
                        />
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={loading || uploading}>
                            {loading && <Spinner className="mr-2 h-4 w-4" />}
                            Create Character
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
