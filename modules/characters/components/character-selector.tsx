"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCharacters } from "../actions";
import { CharacterAvatar } from "@/components/character-avatar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { CharacterFormModal } from "./character-form";

export interface Character {
    id: string;
    name: string;
    description: string;
    avatar?: string | null;
    isDefault: boolean;
    creatorId?: string | null;
}

interface CharacterSelectorProps {
    onSelectCharacter: (characterId: string | null) => void;
    selectedCharacterId: string | null;
}

export function CharacterSelector({ onSelectCharacter, selectedCharacterId }: CharacterSelectorProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { data: characters = [], isLoading } = useQuery({
        queryKey: ["characters"],
        queryFn: async () => {
            const res = await getCharacters();
            if (res.success && res.data) {
                return res.data as Character[];
            }
            return [];
        }
    });

    if (isLoading) {
        return <div className="text-sm text-muted-foreground animate-pulse">Loading characters...</div>;
    }

    return (
        <div className="w-full max-w-3xl flex flex-col space-y-4">
            <h2 className="text-xl font-medium">Choose a Character</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Default General AI Option */}
                <button
                    onClick={() => onSelectCharacter(null)}
                    className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border transition-all text-left hover:bg-accent/50",
                        selectedCharacterId === null ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card"
                    )}
                >
                    <CharacterAvatar name="ZenChat" size="md" />
                    <div className="flex flex-col overflow-hidden">
                        <span className="font-medium truncate">ZenChat Base</span>
                        <span className="text-xs text-muted-foreground truncate">Helpful AI Assistant</span>
                    </div>
                </button>

                {/* Database Characters */}
                {characters.map((char) => (
                    <button
                        key={char.id}
                        onClick={() => onSelectCharacter(char.id)}
                        className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border transition-all text-left hover:bg-accent/50",
                            selectedCharacterId === char.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card"
                        )}
                    >
                        <CharacterAvatar name={char.name} src={char.avatar} size="md" />
                        <div className="flex flex-col overflow-hidden">
                            <span className="font-medium truncate">{char.name}</span>
                            <span className="text-xs text-muted-foreground truncate">{char.description}</span>
                        </div>
                    </button>
                ))}
            </div>

            <div className="pt-2 border-t mt-4 border-border">
                <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={() => setIsModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Character
                </Button>
            </div>

            <CharacterFormModal open={isModalOpen} onOpenChange={setIsModalOpen} />
        </div>
    );
}
