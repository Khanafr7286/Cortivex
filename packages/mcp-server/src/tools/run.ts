/**
 * cortivex_run — Run a pipeline by name or inline YAML.
 */
import {
  PipelineExecutor,
  PipelineLoader,
  type PipelineRun,
} from '@cortivex/core';

export interface RunInput {
  pipeline: string;
  config?: Record<string, unknown>;
}

// Store active/completed runs for the status tool
const activeRuns = new Map<string, PipelineRun>();
const completedRuns: PipelineRun[] = [];
const MAX_COMPLETED = 100;

export function getActiveRuns(): PipelineRun[] {
  return [...activeRuns.values()];
}

export function getCompletedRuns(): PipelineRun[] {
  return [...completedRuns];
}

export function getRunById(runId: string): PipelineRun | undefined {
  return activeRuns.get(runId) ?? completedRuns.find((r) => r.id === runId);
}

export async function runTool(input: RunInput): Promise<{ content: Array<{ type: string; text: string }> }> {
  const loader = new PipelineLoader();
  const executor = new PipelineExecutor();

  let pipelineDef;
  try {
    // Try loading by name first
    pipelineDef = await loader.load(input.pipeline);
  } catch {
    // Try parsing as inline YAML/JSON
    try {
      pipelineDef = loader.loadFromString(input.pipeline);
    } catch (parseErr) {
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
    dryRun: (input.config?.dryRun as boolean) ?? false,
    failureStrategy: (input.config?.failureStrategy as 'stop' | 'continue' | 'retry') ?? 'continue',
    parallelism: (input.config?.parallelism as number) ?? 4,
    verbose: (input.config?.verbose as boolean) ?? false,
    timeout: (input.config?.timeout as number) ?? 300000,
  };

  const run: PipelineRun = await executor.execute(pipelineDef, options);

  // Track the run
  if (run.status === 'running') {
    activeRuns.set(run.id, run);
  } else {
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
