/**
 * cortivex_stop — Stop a running pipeline by writing a signal file.
 * The PipelineExecutor checks for this file between batches.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { getRunById } from './run.js';

export interface StopInput {
  runId: string;
}

export async function stopTool(input: StopInput): Promise<{ content: Array<{ type: string; text: string }> }> {
  if (!input.runId || input.runId.trim() === '') {
    return {
      content: [{
        type: 'text',
        text: 'Error: runId is required. Use cortivex_status to see active runs.',
      }],
    };
  }

  const run = getRunById(input.runId);
  if (!run) {
    return {
      content: [{
        type: 'text',
        text: `No pipeline run found with ID "${input.runId}". Use cortivex_status to see active runs.`,
      }],
    };
  }

  if (run.status !== 'running') {
    return {
      content: [{
        type: 'text',
        text: `Pipeline run "${input.runId}" is not currently running (status: ${run.status}). Only running pipelines can be stopped.`,
      }],
    };
  }

  // Write stop signal file — the executor checks for this between batches
  const signalDir = join(process.cwd(), '.cortivex', 'signals');
  await mkdir(signalDir, { recursive: true });
  await writeFile(
    join(signalDir, `stop-${input.runId}.json`),
    JSON.stringify({ runId: input.runId, signal: 'stop', timestamp: new Date().toISOString() }),
    'utf-8'
  );

  return {
    content: [{
      type: 'text',
      text: [
        `Stop signal sent to pipeline run.`,
        ``,
        `Run ID: ${input.runId}`,
        `Pipeline: ${run.pipeline}`,
        `The pipeline will halt after the current node completes.`,
        `Nodes completed so far: ${run.nodes.filter((n) => n.status === 'completed').length}/${run.nodes.length}`,
      ].join('\n'),
    }],
  };
}
