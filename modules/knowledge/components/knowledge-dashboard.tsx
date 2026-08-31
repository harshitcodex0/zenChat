"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCollections, createCollection, deleteCollection } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Trash, Folder, File, ChevronRight, Upload } from "lucide-react";
import CollectionManager from "./collection-manager";

export default function KnowledgeDashboard() {
    const queryClient = useQueryClient();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

    const { data: response, isPending } = useQuery({
        queryKey: ['knowledgeCollections'],
        queryFn: () => getCollections(),
    });

    const collections = response?.data || [];

    const createMutation = useMutation({
        mutationFn: async () => {
            if (!name.trim()) throw new Error("Name is required");
            const res = await createCollection(name, description);
            if (!res.success) throw new Error(res.error);
            return res.data;
        },
        onSuccess: () => {
            toast.success("Collection created");
            setName("");
            setDescription("");
            queryClient.invalidateQueries({ queryKey: ['knowledgeCollections'] });
        },
        onError: (err: any) => toast.error(err.message || "Failed to create collection")
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await deleteCollection(id);
            if (!res.success) throw new Error(res.error);
        },
        onSuccess: () => {
            toast.success("Collection deleted");
            queryClient.invalidateQueries({ queryKey: ['knowledgeCollections'] });
            setSelectedCollectionId(null);
        },
        onError: (err: any) => toast.error(err.message || "Failed to delete collection")
    });

    if (selectedCollectionId) {
        const coll = collections.find(c => c.id === selectedCollectionId);
        if (coll) {
            return (
                <div className="space-y-6">
                    <Button variant="ghost" onClick={() => setSelectedCollectionId(null)}>
                        &larr; Back to Collections
                    </Button>
                    <CollectionManager collection={coll} />
                </div>
            );
        }
    }

    return (
        <div className="max-w-4xl mx-auto w-full space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold">Knowledge Base</h1>
                <p className="text-muted-foreground">Upload documents to create a searchable context for your AI conversations.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 space-y-4 p-4 border rounded-xl bg-card">
                    <h2 className="text-xl font-semibold">New Collection</h2>
                    <Input 
                        placeholder="Collection Name (e.g. Computer Science)" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        disabled={createMutation.isPending}
                    />
                    <Textarea 
                        placeholder="Description" 
                        value={description} 
                        onChange={e => setDescription(e.target.value)} 
                        disabled={createMutation.isPending}
                    />
                    <Button 
                        onClick={() => createMutation.mutate()} 
                        disabled={createMutation.isPending || !name.trim()}
                        className="w-full"
                    >
                        {createMutation.isPending ? <Spinner /> : "Create Collection"}
                    </Button>
                </div>

                <div className="md:col-span-2 space-y-4">
                    <h2 className="text-xl font-semibold">Your Collections</h2>
                    {isPending ? (
                        <Spinner />
                    ) : collections.length === 0 ? (
                        <div className="text-center p-8 border border-dashed rounded-xl text-muted-foreground">
                            <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No collections yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {collections.map((coll: any) => (
                                <div key={coll.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => setSelectedCollectionId(coll.id)}>
                                    <div className="flex items-center gap-3">
                                        <Folder className="text-blue-500 w-5 h-5" />
                                        <div>
                                            <h3 className="font-medium">{coll.name}</h3>
                                            <p className="text-xs text-muted-foreground">{coll.description || 'No description'} • {coll._count?.documents || 0} documents</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="text-destructive hover:bg-destructive hover:text-white"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if(confirm('Are you sure you want to delete this collection and all its documents?')) {
                                                    deleteMutation.mutate(coll.id);
                                                }
                                            }}
                                        >
                                            <Trash className="w-4 h-4" />
                                        </Button>
                                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
