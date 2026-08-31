"use client"
import React, { useState } from 'react'
import ChatWelcomeTabs from './chat-welcome-tabs';
import ChatMessageForm from './chat-message-form';
import { CharacterSelector } from "@/modules/characters/components/character-selector";

const ChatMessageView = ({user}: {user: { name?: string; [key: string]: unknown }}) => {
    const [selectedMessage , setSelectedMessage] = useState("");
    const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

    const handleMessageSelect = (message: string) => {
        setSelectedMessage(message);
    };

    const handleMessageChange = () => {
        setSelectedMessage("");
    };

    return (
        <div className='flex flex-col items-center justify-center h-screen space-y-10'>
            <div className="w-full max-w-3xl flex flex-col gap-2 px-4 pt-10">
                <h1 className="text-4xl font-semibold mb-6">
                    Welcome back, {user?.name?.split(" ")[0] || "there"}
                </h1>
                
                <CharacterSelector 
                    selectedCharacterId={selectedCharacterId} 
                    onSelectCharacter={setSelectedCharacterId} 
                />
            </div>

            <ChatMessageForm
                initialMessage={selectedMessage}
                onMessageChange={handleMessageChange}
                selectedCharacterId={selectedCharacterId}
            />
        </div>
    )
}

export default ChatMessageView