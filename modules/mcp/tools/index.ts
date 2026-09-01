import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { INTEGRATIONS } from '../registry';

// Here we define the actual Vercel AI SDK tools.
// We only expose a tool if its integration is CONFIGURED.

export async function getActiveToolsForUser(userId: string) {
    const activeTools: Record<string, any> = {};

    const userDbIntegrations = await prisma.integration.findMany({
        where: { userId, status: 'CONNECTED' }
    });

    const activeProviders = new Set(userDbIntegrations.map((i: any) => i.provider));

    // Global: Web Search
    const webSearch = INTEGRATIONS.find((i: any) => i.id === 'web_search');
    if (webSearch && webSearch.envVarCheck && process.env[webSearch.envVarCheck]) {
        activeTools.webSearch = tool({
            description: 'Search the web for real-time information, recent events, or specific queries where you lack knowledge. DO NOT use this tool for general knowledge, coding syntax, or basic facts that you already know, to avoid unnecessary API costs.',
            parameters: z.object({
                query: z.string().optional().describe('The search query to find the requested information. You MUST provide this parameter.'),
            }),
            execute: async (args: { query?: string }) => {
                if (!args.query) {
                    return { result: "Error: You must provide a 'query' parameter to search." };
                }
                try {
                    const response = await fetch('https://api.tavily.com/search', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            api_key: process.env.TAVILY_API_KEY,
                            query: args.query,
                            search_depth: 'basic',
                            max_results: 3
                        })
                    });
                    
                    if (!response.ok) {
                        return { result: `Search failed with status: ${response.status}` };
                    }
                    
                    const data = await response.json();
                    if (data.results && data.results.length > 0) {
                        return { 
                            result: data.results.map((r: any) => `Title: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`).join('\n\n')
                        };
                    }
                    return { result: 'No results found.' };
                } catch (error: any) {
                    return { result: `Search failed: ${error.message}` };
                }
            }
        } as any);
    }

    // Global: Sports
    const sports = INTEGRATIONS.find((i: any) => i.id === 'sports');
    if (sports && sports.envVarCheck && process.env[sports.envVarCheck]) {
        activeTools.sportsApi = tool({
            description: 'Get sports scores and schedules.',
            parameters: z.object({
                team: z.string().describe('The team name'),
            }),
            execute: async (args: { team: string }) => {
                return { result: 'Sports tool called, but requires actual sports API client.' };
            }
        } as any);
    }

    // User: GitHub
    if (activeProviders.has('github')) {
        activeTools.github = tool({
            description: 'Query GitHub for repos, issues, or PRs.',
            parameters: z.object({
                repo: z.string(),
                action: z.enum(['issues', 'prs', 'commits'])
            }),
            execute: async (args: { repo: string; action: 'issues' | 'prs' | 'commits' }) => {
                return { result: 'GitHub API call placeholder. Requires octokit client.' };
            }
        } as any);
    }

    // You would map out Dropbox, OneDrive, Notion, Slack, Canva here as well, checking activeProviders.has('...')

    return activeTools;
}
