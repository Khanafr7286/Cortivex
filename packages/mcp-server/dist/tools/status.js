import { getActiveRuns, getCompletedRuns, getRunById } from './run.js';
export async function statusTool(input) {
    // If a specific runId is given, look it up
    if (input.runId) {
        const run = getRunById(input.runId);
        if (!run) {
            return {
                content: [{
                        type: 'text',
                        text: `No pipeline run found with ID "${input.runId}". It may have expired from memory. Use cortivex_history to check past runs.`,
                    }],
            };
        }
        return {
            content: [{ type: 'text', text: formatRun(run) }],
        };
    }
    // No runId — show all active runs
    const activeRuns = getActiveRuns();
    if (activeRuns.length === 0) {
        // Check completed runs for the most recent one
        const completed = getCompletedRuns();
        if (completed.length === 0) {
            return {
                content: [{
                        type: 'text',
                        text: 'No pipeline runs found. No pipelines are currently running and no completed runs are in memory.',
                    }],
            };
        }
        const latest = completed[completed.length - 1];
        return {
            content: [{
                    type: 'text',
                    text: `No pipelines currently running.\n\nMost recent completed run:\n${formatRun(latest)}`,
                }],
        };
    }
    const lines = activeRuns.map((run) => formatRun(run));
    return {
        content: [{
                type: 'text',
                text: `Active pipeline runs (${activeRuns.length}):\n\n${lines.join('\n\n---\n\n')}`,
            }],
    };
}
function formatRun(run) {
    const duration = run.completedAt
        ? `${((Date.parse(run.completedAt) - Date.parse(run.startedAt)) / 1000).toFixed(1)}s`
        : `${((Date.now() - Date.parse(run.startedAt)) / 1000).toFixed(1)}s (in progress)`;
    const nodeLines = run.nodes.map((n) => {
        const icon = n.status === 'completed' ? '[OK]'
            : n.status === 'failed' ? '[FAIL]'
                : n.status === 'running' ? '[RUNNING]'
                    : n.status === 'skipped' ? '[SKIP]'
                        : '[PENDING]';
        const progress = n.status === 'running' ? ` ${n.progress}%` : '';
        const errStr = n.error ? ` - ${n.error}` : '';
        return `  ${icon} ${n.nodeId}${progress}${errStr}`;
    });
    return [
        `Run ID: ${run.id}`,
        `Pipeline: ${run.pipeline}`,
        `Status: ${run.status}`,
        `Duration: ${duration}`,
        `Cost: $${run.totalCost.toFixed(4)}`,
        `Tokens: ${run.totalTokens}`,
        ``,
        `Nodes:`,
        ...nodeLines,
    ].join('\n');
}
//# sourceMappingURL=status.js.map