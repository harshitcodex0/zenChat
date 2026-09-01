import React from 'react';
import IntegrationsClient from '@/modules/mcp/components/integrations-client';
import { getIntegrationsStatus } from '@/modules/mcp/actions';
import { requireAuth } from '@/modules/authentication/actions';

export default async function IntegrationsPage() {
    await requireAuth();
    const res = await getIntegrationsStatus();
    const initialData = res.success && res.data ? res.data : [];

    return (
        <div className='p-6 h-full overflow-y-auto w-full'>
            <div className='max-w-4xl mx-auto space-y-6'>
                <div>
                    <h1 className='text-3xl font-bold tracking-tight'>Integrations</h1>
                    <p className='text-muted-foreground mt-2'>
                        Connect external tools and APIs for the AI to use. 
                        Integrations marked as NOT CONFIGURED require valid API keys or OAuth setup.
                    </p>
                </div>
                <IntegrationsClient initialData={initialData} />
            </div>
        </div>
    );
}
