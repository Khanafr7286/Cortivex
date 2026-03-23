/**
 * N8n export — converts a Cortivex pipeline definition into an n8n
 * workflow JSON with HTTP Request nodes pointing at the Cortivex
 * HTTP server.
 */
import type { PipelineDefinition } from '../types.js';
export interface N8nWorkflow {
    name: string;
    nodes: N8nNode[];
    connections: Record<string, N8nConnectionGroup>;
    active: boolean;
    settings: {
        executionOrder: string;
        saveManualExecutions: boolean;
        callerPolicy: string;
    };
    versionId: string;
    tags: Array<{
        name: string;
    }>;
}
export interface N8nNode {
    id: string;
    name: string;
    type: string;
    typeVersion: number;
    position: [number, number];
    parameters: Record<string, unknown>;
    credentials?: Record<string, unknown>;
    color?: string;
}
export interface N8nConnectionGroup {
    main: Array<Array<{
        node: string;
        type: string;
        index: number;
    }>>;
}
/**
 * Convert a Cortivex pipeline definition to an n8n workflow JSON.
 */
export declare function exportToN8n(pipeline: PipelineDefinition): N8nWorkflow;
//# sourceMappingURL=n8n.d.ts.map