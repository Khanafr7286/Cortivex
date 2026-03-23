import type { Insight } from '../types.js';
export declare class PatternExtractor {
    private readonly recorder;
    constructor(baseDir?: string);
    /**
     * Analyze all execution history and extract actionable insights.
     */
    analyze(): Promise<Insight[]>;
    /**
     * Group executions by pipeline, language, and node type for analysis.
     */
    private groupExecutions;
    /**
     * Find patterns where reordering nodes improves success rate.
     */
    private findOrderPatterns;
    /**
     * Find opportunities to substitute expensive models with cheaper ones
     * without losing quality.
     */
    private findModelSubstitutions;
    /**
     * Find nodes that can be skipped in certain contexts.
     */
    private findSkipPatterns;
    /**
     * Find nodes with consistent failure patterns.
     */
    private findReliabilityPatterns;
    /**
     * Find cost optimization opportunities.
     */
    private findCostOptimizations;
    /**
     * Find patterns specific to repo context (language, framework, auth, etc.).
     */
    private findContextualPatterns;
}
//# sourceMappingURL=extractor.d.ts.map