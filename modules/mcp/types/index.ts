export type IntegrationType = 'global' | 'user';

export type IntegrationStatus = 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR';

export interface MCPIntegration {
    id: string;
    name: string;
    description: string;
    icon: string;
    type: IntegrationType;
    envVarCheck?: string;
}

export interface UserIntegrationStatus {
    id: string;
    name: string;
    description: string;
    icon: string;
    type: IntegrationType;
    status: IntegrationStatus;
    updatedAt?: Date;
    envVarCheck?: string;
}
