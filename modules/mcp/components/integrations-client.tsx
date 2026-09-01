'use client';

import React from 'react';
import { UserIntegrationStatus } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GitBranch, Cloud, HardDrive, FileText, MessageSquare, Image as ImageIcon, Trophy, Globe, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props {
    initialData: UserIntegrationStatus[];
}

const iconMap: Record<string, React.ReactNode> = {
    Github: <GitBranch className='w-6 h-6' />,
    Cloud: <Cloud className='w-6 h-6' />,
    HardDrive: <HardDrive className='w-6 h-6' />,
    FileText: <FileText className='w-6 h-6' />,
    MessageSquare: <MessageSquare className='w-6 h-6' />,
    Image: <ImageIcon className='w-6 h-6' />,
    Trophy: <Trophy className='w-6 h-6' />,
    Globe: <Globe className='w-6 h-6' />,
};

export default function IntegrationsClient({ initialData }: Props) {
    return (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {initialData.map((integration) => {
                const isConnected = integration.status === 'CONNECTED';
                return (
                    <Card key={integration.id} className='flex flex-col'>
                        <CardHeader className='flex flex-row items-center gap-4 space-y-0'>
                            <div className='p-2 bg-secondary rounded-lg'>
                                {iconMap[integration.icon] || <Globe className='w-6 h-6' />}
                            </div>
                            <div className='flex-1'>
                                <CardTitle className='text-lg'>{integration.name}</CardTitle>
                                <div className='mt-1'>
                                    {isConnected ? (
                                        <Badge variant='default' className='bg-green-600 hover:bg-green-700 gap-1'>
                                            <CheckCircle2 className='w-3 h-3' /> Connected
                                        </Badge>
                                    ) : (
                                        <Badge variant='secondary' className='text-muted-foreground gap-1'>
                                            <AlertCircle className='w-3 h-3' /> NOT CONFIGURED
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className='flex-1 flex flex-col justify-between'>
                            <CardDescription className='mb-4'>
                                {integration.description}
                            </CardDescription>
                            
                            {integration.type === 'global' ? (
                                <p className='text-xs text-muted-foreground'>
                                    Requires ENV variable: <code className='bg-secondary px-1 rounded'>{integration.envVarCheck}</code>
                                </p>
                            ) : (
                                <Button 
                                    variant={isConnected ? 'outline' : 'default'}
                                    className='w-full'
                                    disabled={true}
                                >
                                    {isConnected ? 'Manage' : 'Connect (Not configured)'}
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
