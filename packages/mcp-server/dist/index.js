#!/usr/bin/env node
/**
 * Cortivex MCP Server
 *
 * Exposes 8 tools for building, running, and managing AI agent pipelines
 * via the Model Context Protocol over stdio.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { runTool } from './tools/run.js';
import { createTool } from './tools/create.js';
import { statusTool } from './tools/status.js';
import { listTool } from './tools/list.js';
import { meshTool } from './tools/mesh.js';
import { insightsTool } from './tools/insights.js';
import { historyTool } from './tools/history.js';
import { exportTool } from './tools/export.js';
// ── Tool Definitions ─────────────────────────────────────────────────
const TOOLS = [
    {
        name: 'cortivex_run',
        description: 'Run a Cortivex AI agent pipeline. Loads the pipeline by name (from .cortivex/pipelines/ or built-in templates) ' +
            'or from inline YAML/JSON, then executes all nodes through the DAG respecting dependencies. ' +
            'Returns a detailed execution summary with cost, duration, and success/failure per node.',
        inputSchema: {
            type: 'object',
            properties: {
                pipeline: {
                    type: 'string',
                    description: 'Pipeline name (e.g., "full-review", "quick-fix", "security-audit") or inline YAML/JSON pipeline definition.',
                },
                config: {
                    type: 'object',
                    description: 'Optional execution configuration. Supports: dryRun (boolean), failureStrategy ("stop"|"continue"|"retry"), ' +
                        'parallelism (number), verbose (boolean), timeout (number in ms).',
                    properties: {
                        dryRun: { type: 'boolean', description: 'Simulate execution without actually running nodes.' },
                        failureStrategy: {
                            type: 'string',
                            enum: ['stop', 'continue', 'retry'],
                            description: 'What to do when a node fails.',
                        },
                        parallelism: { type: 'number', description: 'Max concurrent nodes.' },
                        verbose: { type: 'boolean', description: 'Enable verbose output.' },
                        timeout: { type: 'number', description: 'Timeout in milliseconds.' },
                    },
                },
            },
            required: ['pipeline'],
        },
    },
    {
        name: 'cortivex_create',
        description: 'Create a new Cortivex pipeline from a natural language description. The description is analyzed to identify ' +
            'appropriate node types (CodeReviewer, SecurityScanner, TestRunner, AutoFixer, etc.) and their dependencies. ' +
            'The generated pipeline is saved to .cortivex/pipelines/ as YAML and returned.',
        inputSchema: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'Name for the pipeline (used as the filename, e.g., "my-review-pipeline").',
                },
                description: {
                    type: 'string',
                    description: 'Natural language description of what the pipeline should do. Examples: ' +
                        '"review my code and fix bugs", "run security scan then auto-fix", ' +
                        '"full review with tests and PR creation".',
                },
            },
            required: ['name', 'description'],
        },
    },
    {
        name: 'cortivex_status',
        description: 'Check the status of a pipeline run. If a runId is provided, returns detailed status for that specific run. ' +
            'Otherwise, shows all currently active runs or the most recent completed run.',
        inputSchema: {
            type: 'object',
            properties: {
                runId: {
                    type: 'string',
                    description: 'Optional run ID to check. If omitted, shows all active runs.',
                },
            },
        },
    },
    {
        name: 'cortivex_list',
        description: 'List available pipelines. Shows saved user pipelines from .cortivex/pipelines/ and built-in templates. ' +
            'Each entry includes name, description, tags, and node count.',
        inputSchema: {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    enum: ['saved', 'templates', 'all'],
                    description: 'Filter by source: "saved" (user pipelines), "templates" (built-in), or "all" (default).',
                },
            },
        },
    },
    {
        name: 'cortivex_mesh',
        description: 'Query the mesh coordination state. Shows current file ownership claims, active agents, and any conflicts ' +
            'between agents trying to modify the same files. The mesh prevents concurrent write conflicts during pipeline execution.',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'cortivex_insights',
        description: 'Get learning insights from past pipeline executions. The learning engine analyzes execution patterns ' +
            'across runs to surface cost optimizations, reliability improvements, performance recommendations, ' +
            'and ordering suggestions. Includes aggregate statistics (success rate, avg cost, etc.).',
        inputSchema: {
            type: 'object',
            properties: {
                pipeline: {
                    type: 'string',
                    description: 'Optional pipeline name to filter insights for.',
                },
            },
        },
    },
    {
        name: 'cortivex_history',
        description: 'Get execution history for pipeline runs. Shows past runs with status, duration, cost, and node results. ' +
            'Can be filtered by pipeline name and limited to a specific number of results.',
        inputSchema: {
            type: 'object',
            properties: {
                pipeline: {
                    type: 'string',
                    description: 'Optional pipeline name to filter history for.',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of history entries to return (default: 10).',
                },
            },
        },
    },
    {
        name: 'cortivex_export',
        description: 'Export a pipeline in different formats. Supports YAML, JSON, and n8n workflow format. ' +
            'The n8n export generates a complete n8n workflow JSON with HTTP Request nodes pointing to ' +
            'the Cortivex HTTP server (localhost:3939), preserving the DAG structure with proper node connections.',
        inputSchema: {
            type: 'object',
            properties: {
                pipeline: {
                    type: 'string',
                    description: 'Pipeline name or inline YAML/JSON to export.',
                },
                format: {
                    type: 'string',
                    enum: ['n8n', 'yaml', 'json'],
                    description: 'Export format: "n8n" (n8n workflow JSON), "yaml", or "json".',
                },
            },
            required: ['pipeline', 'format'],
        },
    },
];
// ── Server Setup ─────────────────────────────────────────────────────
const server = new Server({
    name: 'cortivex',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
// ── List Tools Handler ───────────────────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
});
// ── Input Validation Helpers ─────────────────────────────────────────
/** Pipeline name pattern: alphanumeric, hyphens, underscores only */
const PIPELINE_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
function validatePipelineName(name) {
    if (!name || typeof name !== 'string') {
        throw new Error('Pipeline name must be a non-empty string');
    }
    if (name.length > 64) {
        throw new Error('Pipeline name must not exceed 64 characters');
    }
    if (!PIPELINE_NAME_PATTERN.test(name)) {
        throw new Error('Pipeline name may only contain alphanumeric characters, hyphens, and underscores');
    }
    return name;
}
function validateLimit(limit) {
    if (limit === undefined || limit === null)
        return 10;
    const num = typeof limit === 'number' ? limit : parseInt(String(limit), 10);
    if (isNaN(num) || num < 1)
        return 1;
    if (num > 1000)
        return 1000;
    return num;
}
function validateString(value, fieldName, maxLength = 1024) {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new Error(`${fieldName} must be a non-empty string`);
    }
    if (value.length > maxLength) {
        throw new Error(`${fieldName} must not exceed ${maxLength} characters`);
    }
    return value;
}
// ── Call Tool Handler ────────────────────────────────────────────────
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case 'cortivex_run': {
                const typedArgs = args;
                validateString(typedArgs.pipeline, 'pipeline');
                // Validate pipeline name if it looks like a simple name (not inline YAML/JSON)
                if (!typedArgs.pipeline.includes('\n') && !typedArgs.pipeline.includes('{') && !typedArgs.pipeline.includes(':')) {
                    validatePipelineName(typedArgs.pipeline);
                }
                return await runTool(typedArgs);
            }
            case 'cortivex_create': {
                const typedArgs = args;
                validatePipelineName(typedArgs.name);
                validateString(typedArgs.description, 'description', 4096);
                return await createTool(typedArgs);
            }
            case 'cortivex_status': {
                const typedArgs = args;
                if (typedArgs.runId !== undefined) {
                    validateString(typedArgs.runId, 'runId', 256);
                }
                return await statusTool(typedArgs);
            }
            case 'cortivex_list': {
                const typedArgs = args;
                if (typedArgs.type !== undefined) {
                    const validTypes = ['saved', 'templates', 'all'];
                    if (!validTypes.includes(typedArgs.type)) {
                        throw new Error(`Invalid type "${typedArgs.type}". Must be one of: ${validTypes.join(', ')}`);
                    }
                }
                return await listTool(typedArgs);
            }
            case 'cortivex_mesh':
                return await meshTool();
            case 'cortivex_insights': {
                const typedArgs = args;
                if (typedArgs.pipeline !== undefined) {
                    validatePipelineName(typedArgs.pipeline);
                }
                return await insightsTool(typedArgs);
            }
            case 'cortivex_history': {
                const typedArgs = args;
                if (typedArgs.pipeline !== undefined) {
                    validatePipelineName(typedArgs.pipeline);
                }
                typedArgs.limit = validateLimit(typedArgs.limit);
                return await historyTool(typedArgs);
            }
            case 'cortivex_export': {
                const typedArgs = args;
                validateString(typedArgs.pipeline, 'pipeline');
                if (!typedArgs.pipeline.includes('\n') && !typedArgs.pipeline.includes('{') && !typedArgs.pipeline.includes(':')) {
                    validatePipelineName(typedArgs.pipeline);
                }
                const validFormats = ['n8n', 'yaml', 'json'];
                if (!validFormats.includes(typedArgs.format)) {
                    throw new Error(`Invalid format "${typedArgs.format}". Must be one of: ${validFormats.join(', ')}`);
                }
                return await exportTool(typedArgs);
            }
            default:
                return {
                    content: [{
                            type: 'text',
                            text: `Unknown tool: "${name}". Available tools: ${TOOLS.map((t) => t.name).join(', ')}`,
                        }],
                    isError: true,
                };
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            content: [{
                    type: 'text',
                    text: `Error executing tool "${name}": ${message}`,
                }],
            isError: true,
        };
    }
});
// ── Start ────────────────────────────────────────────────────────────
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Cortivex MCP server started on stdio');
}
main().catch((error) => {
    console.error('Fatal error starting Cortivex MCP server:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map