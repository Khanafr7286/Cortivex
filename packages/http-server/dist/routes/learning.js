/**
 * Learning / Insights REST endpoints.
 *
 * Mounted at /api/learning so endpoints resolve to:
 *   GET /api/learning/insights
 *   GET /api/learning/history
 */
import { Router } from 'express';
import { PatternExtractor, HistoryRecorder } from '@cortivex/core';
const router = Router();
/**
 * GET /api/learning/insights
 * Get learning insights extracted from execution history.
 */
router.get('/insights', async (_req, res) => {
    try {
        const extractor = new PatternExtractor(process.cwd());
        const insights = await extractor.analyze();
        res.json(insights);
    }
    catch (err) {
        console.error('Failed to get insights:', err instanceof Error ? err.message : err);
        res.json([]);
    }
});
/**
 * GET /api/learning/history
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
        const recorder = new HistoryRecorder(process.cwd());
        const records = await recorder.getHistory(pipeline);
        const limited = records.slice(0, limit);
        res.json(limited.map((r) => ({
            id: r.id,
            pipeline: r.pipeline,
            timestamp: r.timestamp,
            success: r.success,
            totalCost: r.totalCost,
            totalDuration: r.totalDuration,
            nodeCount: r.nodeResults.length,
            failedNodes: r.nodeResults.filter((n) => !n.success).length,
        })));
    }
    catch (err) {
        console.error('Failed to get history:', err instanceof Error ? err.message : err);
        res.json([]);
    }
});
export default router;
//# sourceMappingURL=learning.js.map