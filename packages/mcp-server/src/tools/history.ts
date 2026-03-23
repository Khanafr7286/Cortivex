/**
 * cortivex_history — Get execution history for pipelines.
 */
import { HistoryRecorder } from '@cortivex/core';

export interface HistoryInput {
  pipeline?: string;
  limit?: number;
}

export async function historyTool(input: HistoryInput): Promise<{ content: Array<{ type: string; text: string }> }> {
  const recorder = new HistoryRecorder();
  const limit = input.limit ?? 10;
  const records = await recorder.getHistory(input.pipeline);
  const limited = records.slice(0, limit);

  if (limited.length === 0) {
    return {
      content: [{
        type: 'text',
        text: input.pipeline
          ? `No execution history found for pipeline "${input.pipeline}".`
          : 'No execution history found. Run a pipeline first with cortivex_run.',
      }],
    };
  }

  const lines = limited.map((r, idx) => {
    const status = r.success ? '[OK]' : '[FAIL]';
    const duration = r.totalDuration.toFixed(1);
    const nodeCount = r.nodeResults.length;
    const failedNodes = r.nodeResults.filter((n) => !n.success);
    const failedStr = failedNodes.length > 0
      ? `\n    Failed nodes: ${failedNodes.map((n) => n.nodeId).join(', ')}`
      : '';

    return [
      `  ${idx + 1}. ${status} ${r.pipeline}`,
      `    Run ID: ${r.id}`,
      `    Date: ${r.timestamp}`,
      `    Duration: ${duration}s`,
      `    Cost: $${r.totalCost.toFixed(4)}`,
      `    Nodes: ${nodeCount} total, ${nodeCount - failedNodes.length} succeeded, ${failedNodes.length} failed`,
      failedStr,
    ].filter(Boolean).join('\n');
  });

  const header = input.pipeline
    ? `Execution History for "${input.pipeline}" (${limited.length} runs):`
    : `Execution History (${limited.length} most recent):`;

  return {
    content: [{ type: 'text', text: `${header}\n\n${lines.join('\n\n')}` }],
  };
}
