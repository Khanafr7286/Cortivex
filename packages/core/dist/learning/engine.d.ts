import type { Insight, ExecutionRecord, PipelineRun, AggregateStats } from '../types.js';
declare class LearningEngineSingleton {
    private records;
    private insights;
    /**
     * Record a completed pipeline run for learning.
     */
    record(run: PipelineRun): void;
    /**
     * Get all insights, optionally filtered by pipeline name.
     */
    getInsights(pipeline?: string): Insight[];
    /**
     * Get execution history, optionally filtered and limited.
     */
    getHistory(pipeline?: string, limit?: number): ExecutionRecord[];
    /**
     * Get aggregate statistics.
     */
    getStats(pipeline?: string): AggregateStats;
    private analyzeNewRecord;
    private detectCostPatterns;
    private detectReliabilityPatterns;
    private detectPerformancePatterns;
    private detectOrderingPatterns;
    private addInsight;
    /**
     * Reset all state (for testing).
     */
    reset(): void;
}
export declare const LearningEngine: LearningEngineSingleton;
export {};
//# sourceMappingURL=engine.d.ts.map