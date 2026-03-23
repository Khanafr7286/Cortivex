/**
 * Learning / Insights REST endpoints.
 */
import { Router } from 'express';
import { LearningEngine, HistoryRecorder } from '@cortivex/core';
const router = Router();
/**
 * GET /api/insights
 * Get learning insights and aggregate statistics.
 */
router.get('/insights', async (req, res) => {
    try {
        const pipeline = req.query.pipeline;
        const recorder = new HistoryRecorder();
        const stats = await recorder.getStats();
        const insights = LearningEngine.getInsights(pipeline);
        res.json({
            stats,
            insights: insights.sort((a, b) => b.confidence - a.confidence),
        });
    }
    catch (err) {
        res.status(500).json({
            error: 'Failed to get insights',
            details: err instanceof Error ? err.message : String(err),
        });
    }
});
/**
 * GET /api/history
 * Get execution history with optional filters.
 */
router.get('/history', async (req, res) => {
    try {
        const pipeline = req.query.pipeline;
        const limitStr = req.query.limit;
        let limit = limitStr ? parseInt(limitStr, 10) : 50;
        // Bounds check: clamp limit to 1-1000
        if (isNaN(limit) || limit < 1)
            limit = 1;
        if (limit > 1000)
            limit = 1000;
        const recorder = new HistoryRecorder();
        const records = await recorder.getHistory(pipeline);
        const limited = records.slice(0, limit);
        res.json({
            total: records.length,
            returned: limited.length,
            records: limited.map((r) => ({
                id: r.id,
                pipeline: r.pipeline,
                timestamp: r.timestamp,
                success: r.success,
                totalCost: r.totalCost,
                totalDuration: r.totalDuration,
                nodeCount: r.nodeResults.length,
                failedNodes: r.nodeResults.filter((n) => !n.success).length,
            })),
        });
    }
    catch (err) {
        res.status(500).json({
            error: 'Failed to get history',
            details: err instanceof Error ? err.message : String(err),
        });
    }
});
export default router;
//# sourceMappingURL=learning.js.map