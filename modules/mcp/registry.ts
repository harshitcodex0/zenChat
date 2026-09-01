import { MCPIntegration } from './types';

export const INTEGRATIONS: MCPIntegration[] = [
    {
        id: 'github',
        name: 'GitHub',
        description: 'Read repositories, issues, and pull requests.',
        icon: 'Github',
        type: 'user',
    },
    {
        id: 'dropbox',
        name: 'Dropbox',
        description: 'Access files and folders in your Dropbox.',
        icon: 'Cloud',
        type: 'user',
    },
    {
        id: 'onedrive',
        name: 'OneDrive',
        description: 'Search and read documents from Microsoft OneDrive.',
        icon: 'Cloud',
        type: 'user',
    },
    {
        id: 'google_drive',
        name: 'Google Drive',
        description: 'Search and read documents from Google Drive.',
        icon: 'HardDrive',
        type: 'user',
    },
    {
        id: 'notion',
        name: 'Notion',
        description: 'Query Notion databases and pages.',
        icon: 'FileText',
        type: 'user',
    },
    {
        id: 'slack',
        name: 'Slack',
        description: 'Search Slack messages and channels.',
        icon: 'MessageSquare',
        type: 'user',
    },
    {
        id: 'canva',
        name: 'Canva',
        description: 'Access Canva designs and assets.',
        icon: 'Image',
        type: 'user',
    },
    {
        id: 'sports',
        name: 'Sports API',
        description: 'Real-time sports scores and schedules.',
        icon: 'Trophy',
        type: 'global',
        envVarCheck: 'SPORTS_API_KEY',
    },
    {
        id: 'web_search',
        name: 'Web Search',
        description: 'Search the web for real-time information.',
        icon: 'Globe',
        type: 'global',
        envVarCheck: 'TAVILY_API_KEY',
    }
];
