/**
 * LearningEngine — analyses past pipeline executions to surface
 * actionable insights (patterns, cost optimizations, reliability
 * improvements, etc.).
 */
import { randomUUID } from 'node:crypto';
class LearningEngineSingleton {
    records = [];
    insights = [];
    /**
     * Record a completed pipeline run for learning.
     */
    record(run) {
        const rec = {
            id: run.id,
            pipeline: run.pipeline,
            timestamp: run.startedAt,
            success: run.status === 'completed',
            totalCost: run.totalCost,
            totalDuration: run.completedAt
                ? Date.parse(run.completedAt) - Date.parse(run.startedAt)
                : 0,
            nodeResults: run.nodes.map((n) => ({
                nodeId: n.nodeId,
                nodeType: n.nodeId.replace(/-\d+$/, '')
                    .split('-')
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(''),
                success: n.status === 'completed',
                cost: n.cost,
                duration: n.startedAt && n.completedAt
                    ? Date.parse(n.completedAt) - Date.parse(n.startedAt)
                    : 0,
                model: n.model ?? 'claude-sonnet-4-20250514',
                error: n.error,
            })),
            repoContext: {
                languages: [],
                hasTests: false,
                fileCount: 0,
                hasAuth: false,
            },
        };
        this.records.push(rec);
        this.analyzeNewRecord(rec);
    }
    /**
     * Get all insights, optionally filtered by pipeline name.
     */
    getInsights(pipeline) {
        if (!pipeline)
            return [...this.insights];
        return this.insights.filter((i) => i.details.pipeline === pipeline || !i.details.pipeline);
    }
    /**
     * Get execution history, optionally filtered and limited.
     */
    getHistory(pipeline, limit) {
        let records = [...this.records].reverse();
        if (pipeline) {
            records = records.filter((r) => r.pipeline === pipeline);
        }
        if (limit && limit > 0) {
            records = records.slice(0, limit);
        }
        return records;
    }
    /**
     * Get aggregate statistics.
     */
    getStats(pipeline) {
        let records = this.records;
        if (pipeline) {
            records = records.filter((r) => r.pipeline === pipeline);
        }
        if (records.length === 0) {
            return {
                totalRuns: 0,
                successfulRuns: 0,
                failedRuns: 0,
                successRate: 0,
                averageCost: 0,
                totalCost: 0,
                averageDuration: 0,
                mostUsedPipeline: 'n/a',
                mostExpensiveNode: 'n/a',
                leastReliableNode: 'n/a',
            };
        }
        const successful = records.filter((r) => r.success).length;
        const totalCost = records.reduce((s, r) => s + r.totalCost, 0);
        const totalDuration = records.reduce((s, r) => s + r.totalDuration, 0);
        // Most-used pipeline
        const pipelineCounts = new Map();
        for (const r of records) {
            pipelineCounts.set(r.pipeline, (pipelineCounts.get(r.pipeline) ?? 0) + 1);
        }
        const mostUsedPipeline = [...pipelineCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'n/a';
        // Most expensive node type
        const nodeCosts = new Map();
        const nodeFailures = new Map();
        for (const r of records) {
            for (const nr of r.nodeResults) {
                nodeCosts.set(nr.nodeType, (nodeCosts.get(nr.nodeType) ?? 0) + nr.cost);
                const entry = nodeFailures.get(nr.nodeType) ?? { fail: 0, total: 0 };
                entry.total++;
                if (!nr.success)
                    entry.fail++;
                nodeFailures.set(nr.nodeType, entry);
            }
        }
        const mostExpensiveNode = [...nodeCosts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'n/a';
        const leastReliableNode = [...nodeFailures.entries()]
            .filter(([, v]) => v.total >= 2)
            .sort((a, b) => b[1].fail / b[1].total - a[1].fail / a[1].total)[0]?.[0] ?? 'n/a';
        return {
            totalRuns: records.length,
            successfulRuns: successful,
            failedRuns: records.length - successful,
            successRate: successful / records.length,
            averageCost: totalCost / records.length,
            totalCost,
            averageDuration: totalDuration / records.length,
            mostUsedPipeline,
            mostExpensiveNode,
            leastReliableNode,
        };
    }
    // ── Private analysis ───────────────────────────────────────────
    analyzeNewRecord(record) {
        this.detectCostPatterns(record);
        this.detectReliabilityPatterns(record);
        this.detectPerformancePatterns(record);
        this.detectOrderingPatterns();
    }
    detectCostPatterns(record) {
        // High-cost node detection
        for (const nr of record.nodeResults) {
            if (nr.cost > 0.15) {
                this.addInsight({
                    pattern: `high-cost-${nr.nodeType}`,
                    description: `${nr.nodeType} node has high cost ($${nr.cost.toFixed(2)}). Consider using a smaller model for this step.`,
                    confidence: 0.7,
                    action: 'substitute_model',
                    details: { nodeType: nr.nodeType, cost: nr.cost, pipeline: record.pipeline },
                });
            }
        }
        // Pipeline total cost trend
        const sameRuns = this.records.filter((r) => r.pipeline === record.pipeline);
        if (sameRuns.length >= 3) {
            const avgCost = sameRuns.reduce((s, r) => s + r.totalCost, 0) / sameRuns.length;
            if (avgCost > 0.50) {
                this.addInsight({
                    pattern: `expensive-pipeline-${record.pipeline}`,
                    description: `Pipeline "${record.pipeline}" averages $${avgCost.toFixed(2)} per run. Consider removing non-essential nodes.`,
                    confidence: 0.8,
                    action: 'skip_node',
                    details: { pipeline: record.pipeline, avgCost },
                });
            }
        }
    }
    detectReliabilityPatterns(record) {
        const failedNodes = record.nodeResults.filter((n) => !n.success);
        for (const fn of failedNodes) {
            const allRuns = this.records.flatMap((r) => r.nodeResults.filter((n) => n.nodeType === fn.nodeType));
            const failRate = allRuns.filter((n) => !n.success).length / allRuns.length;
            if (failRate > 0.2 && allRuns.length >= 2) {
                this.addInsight({
                    pattern: `unreliable-${fn.nodeType}`,
                    description: `${fn.nodeType} has a ${(failRate * 100).toFixed(0)}% failure rate. Consider adding retries or using a more capable model.`,
                    confidence: Math.min(0.95, 0.5 + allRuns.length * 0.05),
                    action: 'substitute_model',
                    details: { nodeType: fn.nodeType, failRate, totalRuns: allRuns.length },
                });
            }
        }
    }
    detectPerformancePatterns(record) {
        for (const nr of record.nodeResults) {
            if (nr.duration > 120_000) {
                this.addInsight({
                    pattern: `slow-node-${nr.nodeType}`,
                    description: `${nr.nodeType} took ${(nr.duration / 1000).toFixed(0)}s. Consider parallelizing or breaking into smaller tasks.`,
                    confidence: 0.6,
                    action: 'reorder',
                    details: { nodeType: nr.nodeType, duration: nr.duration },
                });
            }
        }
    }
    detectOrderingPatterns() {
        // If we have enough data, check if certain node orderings tend to succeed more
        if (this.records.length < 5)
            return;
        const successfulPipelines = this.records.filter((r) => r.success);
        const failedPipelines = this.records.filter((r) => !r.success);
        if (failedPipelines.length > 0 && successfulPipelines.length > 0) {
            // Check if linting before reviewing correlates with success
            const lintFirstSuccess = successfulPipelines.filter((r) => {
                const lintIdx = r.nodeResults.findIndex((n) => n.nodeType.includes('Linter'));
                const reviewIdx = r.nodeResults.findIndex((n) => n.nodeType.includes('CodeReviewer'));
                return lintIdx >= 0 && reviewIdx >= 0 && lintIdx < reviewIdx;
            });
            if (lintFirstSuccess.length > successfulPipelines.length * 0.6) {
                this.addInsight({
                    pattern: 'lint-before-review',
                    description: 'Pipelines that run Linter before CodeReviewer have higher success rates. Consider reordering.',
                    confidence: 0.75,
                    action: 'reorder',
                    details: { suggestion: 'Place Linter node before CodeReviewer node' },
                });
            }
        }
    }
    addInsight(partial) {
        // Update existing insight if pattern matches
        const existing = this.insights.find((i) => i.pattern === partial.pattern);
        if (existing) {
            existing.confidence = Math.min(0.99, Math.max(existing.confidence, partial.confidence));
            existing.basedOnRuns = this.records.length;
            existing.details = { ...existing.details, ...partial.details };
            return;
        }
        this.insights.push({
            id: randomUUID(),
            pattern: partial.pattern,
            description: partial.description,
            confidence: partial.confidence,
            basedOnRuns: this.records.length,
            action: partial.action,
            details: partial.details,
            discoveredAt: new Date().toISOString(),
        });
    }
    /**
     * Reset all state (for testing).
     */
    reset() {
        this.records = [];
        this.insights = [];
    }
}
export const LearningEngine = new LearningEngineSingleton();
//# sourceMappingURL=engine.js.map