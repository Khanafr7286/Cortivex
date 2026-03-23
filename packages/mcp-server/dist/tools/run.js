/**
 * cortivex_run — Run a pipeline by name or inline YAML.
 */
import { PipelineExecutor, PipelineLoader, } from '@cortivex/core';
// Store active/completed runs for the status tool
const activeRuns = new Map();
const completedRuns = [];
const MAX_COMPLETED = 100;
export function getActiveRuns() {
    return [...activeRuns.values()];
}
export function getCompletedRuns() {
    return [...completedRuns];
}
export function getRunById(runId) {
    return activeRuns.get(runId) ?? completedRuns.find((r) => r.id === runId);
}
export async function runTool(input) {
    const loader = new PipelineLoader();
    const executor = new PipelineExecutor();
    let pipelineDef;
    try {
        // Try loading by name first
        pipelineDef = await loader.load(input.pipeline);
    }
    catch {
        // Try parsing as inline YAML/JSON
        try {
            pipelineDef = loader.loadFromString(input.pipeline);
        }
        catch (parseErr) {
            return {
                content: [{
                        type: 'text',
                        text: `Error: Could not find or parse pipeline "${input.pipeline}". ` +
                            `Use cortivex_list to see available pipelines, or provide valid YAML/JSON inline.\n` +
                            `Parse error: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
                    }],
            };
        }
    }
    const options = {
        dryRun: input.config?.dryRun ?? false,
        failureStrategy: input.config?.failureStrategy ?? 'continue',
        parallelism: input.config?.parallelism ?? 4,
        verbose: input.config?.verbose ?? false,
        timeout: input.config?.timeout ?? 300000,
    };
    const run = await executor.execute(pipelineDef, options);
    // Track the run
    if (run.status === 'running') {
        activeRuns.set(run.id, run);
    }
    else {
        activeRuns.delete(run.id);
        completedRuns.push(run);
        if (completedRuns.length > MAX_COMPLETED) {
            completedRuns.shift();
        }
    }
    // Build summary
    const nodeLines = run.nodes.map((n) => {
        const icon = n.status === 'completed' ? '[OK]' : n.status === 'failed' ? '[FAIL]' : `[${n.status.toUpperCase()}]`;
        const costStr = n.cost > 0 ? ` ($${n.cost.toFixed(4)})` : '';
        const durStr = n.startedAt && n.completedAt
            ? ` ${((Date.parse(n.completedAt) - Date.parse(n.startedAt)) / 1000).toFixed(1)}s`
            : '';
        const errStr = n.error ? `\n    Error: ${n.error}` : '';
        return `  ${icon} ${n.nodeId}${durStr}${costStr}${errStr}`;
    });
    const duration = run.completedAt
        ? ((Date.parse(run.completedAt) - Date.parse(run.startedAt)) / 1000).toFixed(1)
        : 'in progress';
    const summary = [
        `Pipeline: ${run.pipeline}`,
        `Run ID: ${run.id}`,
        `Status: ${run.status}`,
        `Duration: ${duration}s`,
        `Total Cost: $${run.totalCost.toFixed(4)}`,
        `Total Tokens: ${run.totalTokens}`,
        ``,
        `Node Results:`,
        ...nodeLines,
    ].join('\n');
    return {
        content: [{ type: 'text', text: summary }],
    };
}
//# sourceMappingURL=run.js.map