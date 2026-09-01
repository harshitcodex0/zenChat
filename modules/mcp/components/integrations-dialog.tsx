'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { getIntegrationsStatus } from '@/modules/mcp/actions';
import IntegrationsClient from './integrations-client';
import { UserIntegrationStatus } from '../types';

export function IntegrationsDialog({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [data, setData] = useState<UserIntegrationStatus[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setLoading(true);
            getIntegrationsStatus().then(res => {
                if (res.success && res.data) {
                    setData(res.data);
                }
                setLoading(false);
            });
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={children as any} />
            <DialogContent className='w-[90vw] max-w-5xl sm:max-w-5xl max-h-[85vh] overflow-y-auto'>
                <DialogHeader>
                    <DialogTitle className='text-2xl'>Integrations</DialogTitle>
                    <DialogDescription>
                        Connect external tools and APIs for the AI to use.
                    </DialogDescription>
                </DialogHeader>
                <div className='mt-4'>
                    {loading ? (
                        <div className='flex justify-center p-12'><Spinner /></div>
                    ) : (
                        <IntegrationsClient initialData={data} />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
