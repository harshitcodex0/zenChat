import { requireAuth } from '@/modules/authentication/actions';
import KnowledgeDashboard from '@/modules/knowledge/components/knowledge-dashboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Knowledge Base | ZenChat',
    description: 'Manage your documents and collections for AI conversations.',
};

export default async function KnowledgePage() {
    await requireAuth();

    return (
        <div className="h-full flex flex-col p-6 overflow-y-auto">
            <KnowledgeDashboard />
        </div>
    );
}
