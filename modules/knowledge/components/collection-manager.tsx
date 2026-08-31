"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDocuments, uploadDocument, deleteDocument } from "../actions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Trash, FileText, Image as ImageIcon, Video, Upload, CheckCircle, AlertCircle, Clock } from "lucide-react";

export default function CollectionManager({ collection }: { collection: any }) {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const { data: response, isPending } = useQuery({
        queryKey: ['knowledgeDocuments', collection.id],
        queryFn: () => getDocuments(collection.id),
        refetchInterval: 3000 // Poll to check status updates
    });

    const documents = response?.data || [];

    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            const res = await uploadDocument(collection.id, formData);
            if (!res.success) throw new Error(res.error);
            return res.data;
        },
        onSuccess: () => {
            toast.success("Document uploaded and processing started");
            queryClient.invalidateQueries({ queryKey: ['knowledgeDocuments', collection.id] });
            queryClient.invalidateQueries({ queryKey: ['knowledgeCollections'] });
        },
        onError: (err: any) => toast.error(err.message || "Failed to upload document"),
        onSettled: () => {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await deleteDocument(id);
            if (!res.success) throw new Error(res.error);
        },
        onSuccess: () => {
            toast.success("Document deleted");
            queryClient.invalidateQueries({ queryKey: ['knowledgeDocuments', collection.id] });
            queryClient.invalidateQueries({ queryKey: ['knowledgeCollections'] });
        },
        onError: (err: any) => toast.error(err.message || "Failed to delete document")
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setIsUploading(true);
            uploadMutation.mutate(e.target.files[0]);
        }
    };

    const getIconForType = (type: string) => {
        switch(type) {
            case 'PDF': return <FileText className="w-5 h-5 text-red-500" />;
            case 'IMAGE': return <ImageIcon className="w-5 h-5 text-blue-500" />;
            case 'VIDEO': return <Video className="w-5 h-5 text-purple-500" />;
            default: return <FileText className="w-5 h-5 text-gray-500" />;
        }
    };

    const getStatusIcon = (status: string) => {
        switch(status) {
            case 'PROCESSED': return <CheckCircle className="w-4 h-4 text-green-500" title="Processed" />;
            case 'ERROR': return <AlertCircle className="w-4 h-4 text-red-500" title="Error" />;
            default: return <Clock className="w-4 h-4 text-yellow-500" title="Processing" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
                <div>
                    <h2 className="text-2xl font-bold">{collection.name}</h2>
                    <p className="text-muted-foreground">{collection.description || 'Manage documents for this collection.'}</p>
                </div>
                <div>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".txt,.md,.pdf,image/*,video/*"
                        onChange={handleFileChange}
                    />
                    <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                        {isUploading ? <Spinner className="mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                        Upload Document
                    </Button>
                </div>
            </div>

            {isPending ? (
                <Spinner />
            ) : documents.length === 0 ? (
                <div className="text-center p-12 border border-dashed rounded-xl text-muted-foreground bg-accent/30">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No documents uploaded yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {documents.map((doc: any) => (
                        <div key={doc.id} className="flex items-start justify-between p-4 border rounded-xl bg-card">
                            <div className="flex items-start gap-3">
                                <div className="mt-1">{getIconForType(doc.type)}</div>
                                <div>
                                    <h3 className="font-medium text-sm line-clamp-1" title={doc.title}>{doc.title}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        {getStatusIcon(doc.status)}
                                        <span className="text-xs text-muted-foreground">{doc.status}</span>
                                    </div>
                                </div>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive h-8 w-8"
                                onClick={() => {
                                    if(confirm('Delete this document?')) {
                                        deleteMutation.mutate(doc.id);
                                    }
                                }}
                            >
                                <Trash className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
