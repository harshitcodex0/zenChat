"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import UserButton from "@/modules/authentication/components/user-button";
import { PlusIcon, SearchIcon, EllipsisIcon, Trash } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState, useMemo } from "react";
import { isToday, isYesterday, isWithinInterval, subDays } from "date-fns";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname } from "next/navigation";
import DeleteChatModel from "@/components/delete-chat-model";
import { useGetChats } from "../hooks/use-chats";
import { Spinner } from "@/components/ui/spinner";

import { buttonVariants } from "@/components/ui/button";

function groupChatsByDate(chats: unknown) {
    const groups: { today: Chat[], yesterday: Chat[], lastWeek: Chat[], older: Chat[] } = { today: [], yesterday: [], lastWeek: [], older: [] };
    const now = new Date();

    if (!chats || !Array.isArray(chats)) return groups;

    chats.forEach((chat) => {
        try {
            const chatDate = chat.createdAt;
            const date = typeof chatDate === "string" ? new Date(chatDate) : chatDate;

            console.log("Processing chat:", chat.id, "Date:", date, "createdAt:", chatDate);

            if (isToday(date)) {
                groups.today.push(chat);
            } else if (isYesterday(date)) {
                groups.yesterday.push(chat);
            } else if (isWithinInterval(date, { start: subDays(now, 7), end: now })) {
                groups.lastWeek.push(chat);
            } else {
                groups.older.push(chat);
            }
        } catch (error) {
            console.error("Error processing chat date:", error, chat);
            groups.older.push(chat);
        }
    });

    return groups;
}

const DATE_GROUPS: { key: "today" | "yesterday" | "lastWeek" | "older", label: string }[] = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "lastWeek", label: "Last 7 Days" },
    { key: "older", label: "Older" },
];

import { CharacterAvatar } from "@/components/character-avatar";

interface Chat {
    id: string;
    title: string;
    createdAt: string | Date;
    messages?: unknown[];
    character?: any;
}

function ChatItem({ chat, isActive, onDelete }: { chat: Chat, isActive: boolean, onDelete: (e: React.MouseEvent, chatId: string) => void }) {
    return (
        <Link
            href={`/chat/${chat.id}`}
            className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors group",
                isActive && "bg-sidebar-accent",
            )}
        >
            <div className="flex items-center gap-2 overflow-hidden flex-1">
                {chat.character ? (
                    <CharacterAvatar name={chat.character.name} src={chat.character.avatar} size="sm" className="w-5 h-5 text-[10px]" />
                ) : null}
                <span className="truncate">{chat.title}</span>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger
                    className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-6 w-6 shrink-0 hover:bg-sidebar-accent-foreground/10")}
                    onClick={(e) => e.preventDefault()}
                >
                    <EllipsisIcon className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem
                        className="text-red-500 cursor-pointer"
                        onClick={(e) => onDelete(e, chat.id)}
                    >
                        <Trash className="h-4 w-4 mr-2" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </Link>
    );
}

function ChatGroup({ label, chats, activeChatId, onDelete }: { label: string, chats: Chat[], activeChatId: string | null, onDelete: (e: React.MouseEvent, chatId: string) => void }) {
    if (chats.length === 0) return null;

    return (
        <div className="mb-4">
            <div className="mb-2 px-2 text-xs font-semibold text-muted-foreground">
                {label}
            </div>
            {chats.map((chat) => (
                <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={chat.id === activeChatId}
                    onDelete={onDelete}
                />
            ))}
        </div>
    );
}

const ChatSidebar = ({ user }: { user: any }) => {
    const { data: chats = [], isPending } = useGetChats();

    console.log("Fetched chats:", chats);
    const pathname = usePathname();
    const activeChatId = pathname?.startsWith("/chat/")
        ? pathname.split("/")[2]
        : null;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);


    const filteredChats = useMemo(() => {
        if (!searchQuery) return chats;
        const query = searchQuery.toLowerCase();

        return chats.filter(
            (chat: Chat) =>
                chat.title?.toLowerCase().includes(query) ||
                (chat.messages && chat.messages.some((msg: unknown) =>
                    (msg as { content?: string })?.content?.toLowerCase().includes(query),
                )),
        );
    }, [searchQuery, chats]);

    const groupedChats = useMemo(() => {
        const result = groupChatsByDate(filteredChats);
        console.log("Filtered chats:", filteredChats);
        console.log("Grouped chats:", result);
        return result;
    }, [filteredChats]);

    const handleDelete = (e: React.MouseEvent, chatId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedChatId(chatId);
        setIsModalOpen(true);
    };

    if (isPending) {
        return <Spinner className="m-auto" />;
    }
    return (
        <div className="flex h-full w-64 flex-col border-r border-border bg-sidebar">
            {/* Header */}
            <div className="flex items-center border-b border-sidebar-border px-4 py-3">
                <Image src="/logo.svg" alt="Logo" width={100} height={100} />
            </div>

            <div className="p-4 space-y-2">
                <Link href="/" className={cn(buttonVariants({ variant: "default" }), "w-full")}>
                    <PlusIcon className="mr-2 h-4 w-4" />
                    New Chat
                </Link>
                <Link href="/knowledge" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    Knowledge Base
                </Link>
            </div>

            <div className="px-4 pb-4">
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search your threads..."
                        className="pl-9 pr-8 bg-sidebar-accent border-sidebar-border"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />

                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            ×
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2">
                {filteredChats.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-8">
                        {searchQuery ? "No chats found" : "No chats yet"}
                    </div>
                ) : (
                    DATE_GROUPS.map((group) => (
                        <ChatGroup
                            key={group.key}
                            label={group.label}
                            chats={groupedChats[group.key]}
                            activeChatId={activeChatId}
                            onDelete={handleDelete}
                        />
                    ))
                )}
            </div>

            {/* Footer */}

            <div className="p-4 flex items-center gap-3 border-t border-sidebar-border">
                <UserButton user={user} />
                <span className="flex-1 text-sm text-sidebar-foreground truncate">
          {user.email}
        </span>
            </div>

            <DeleteChatModel
                chatId={selectedChatId}
                isModalOpen={isModalOpen}
                setIsModalOpen={setIsModalOpen}
            />
        </div>
    );
};

export default ChatSidebar;