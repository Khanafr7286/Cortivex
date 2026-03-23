import type { PipelineDefinition, Insight } from '../types.js';
export interface AppliedChange {
    insight: Insight;
    description: string;
    applied: boolean;
    reason?: string;
}
export declare class InsightApplier {
    /**
     * Apply insights to a pipeline, returning a modified pipeline and a log of changes.
     * Does not mutate the original pipeline.
     */
    apply(pipeline: PipelineDefinition, insights: Insight[]): {
        pipeline: PipelineDefinition;
        changes: AppliedChange[];
    };
    private applyReorder;
    private applyModelSubstitution;
    private applySkipNode;
    private applyAddNode;
}
//# sourceMappingURL=applier.d.ts.map