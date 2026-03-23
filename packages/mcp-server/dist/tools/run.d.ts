/**
 * cortivex_run — Run a pipeline by name or inline YAML.
 */
import { type PipelineRun } from '@cortivex/core';
export interface RunInput {
    pipeline: string;
    config?: Record<string, unknown>;
}
export declare function getActiveRuns(): PipelineRun[];
export declare function getCompletedRuns(): PipelineRun[];
export declare function getRunById(runId: string): PipelineRun | undefined;
export declare function runTool(input: RunInput): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=run.d.ts.map