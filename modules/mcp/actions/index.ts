'use server';

import { currentUser } from '@/modules/authentication/actions';
import { prisma } from '@/lib/db';
import { INTEGRATIONS } from '../registry';
import { UserIntegrationStatus } from '../types';

export async function getIntegrationsStatus(): Promise<{ success: boolean, data?: UserIntegrationStatus[], message?: string }> {
    try {
        const user = await currentUser();
        if (!user) return { success: false, message: 'Unauthorized' };

        // Fetch user integrations from DB
        const userDbIntegrations = await prisma.integration.findMany({
            where: { userId: user.id }
        });

        const statuses: UserIntegrationStatus[] = INTEGRATIONS.map(integration => {
            let status: 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR' = 'NOT_CONFIGURED';
            let updatedAt: Date | undefined = undefined;

            if (integration.type === 'global') {
                if (integration.envVarCheck && process.env[integration.envVarCheck]) {
                    status = 'CONNECTED';
                }
            } else {
                const dbMatch = userDbIntegrations.find((db: any) => db.provider === integration.id);
                if (dbMatch && dbMatch.status === 'CONNECTED') {
                    status = 'CONNECTED';
                    updatedAt = dbMatch.updatedAt;
                }
            }

            return {
                ...integration,
                status,
                updatedAt
            };
        });

        return { success: true, data: statuses };
    } catch (error) {
        console.error('Error fetching integrations:', error);
        return { success: false, message: 'Failed to fetch integrations' };
    }
}
