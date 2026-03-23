/**
 * Pipeline REST endpoints.
 */
import { Router } from 'express';
import { PipelineExecutor, PipelineLoader, generatePipeline, serializePipelineYaml, exportToN8n, } from '@cortivex/core';
import { attachExecutorEvents } from '../ws/handler.js';
import { swarmSimulator } from '../swarm/simulator.js';
import { validatePipelineName } from '../index.js';
const router = Router();
// In-memory run tracking
const activeRuns = new Map();
const completedRuns = [];
const MAX_COMPLETED = 200;
/**
 * POST /api/pipeline/run
 * Run a pipeline by name or inline definition.
 */
router.post('/run', async (req, res) => {
    try {
        const { pipeline, config } = req.body;
        if (!pipeline) {
            res.status(400).json({ error: 'Missing required field: pipeline' });
            return;
        }
        // If pipeline looks like a simple name (no whitespace/special chars), validate it
        if (!pipeline.includes('\n') && !pipeline.includes('{') && !pipeline.includes(':')) {
            try {
                validatePipelineName(pipeline);
            }
            catch (err) {
                res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid pipeline name' });
                return;
            }
        }
        const loader = new PipelineLoader();
        const executor = new PipelineExecutor();
        // Attach WebSocket event broadcasting
        attachExecutorEvents(executor);
        let pipelineDef;
        try {
            pipelineDef = await loader.load(pipeline);
        }
        catch {
            try {
                pipelineDef = loader.loadFromString(pipeline);
            }
            catch (parseErr) {
                res.status(404).json({
                    error: `Could not find or parse pipeline "${pipeline}"`,
                    details: parseErr instanceof Error ? parseErr.message : String(parseErr),
                });
                return;
            }
        }
        const options = {
            dryRun: config?.dryRun ?? false,
            failureStrategy: config?.failureStrategy ?? 'continue',
            parallelism: config?.parallelism ?? 4,
            verbose: config?.verbose ?? false,
            timeout: config?.timeout ?? 300000,
        };
        // Start SWARM simulator for live consensus visualization
        if (!options.dryRun) {
            swarmSimulator.start(pipelineDef.nodes?.length ?? 5);
        }
        // Start execution (don't await — return runId immediately)
        const runPromise = executor.execute(pipelineDef, options);
        // Track it while it's running
        runPromise.then((run) => {
            activeRuns.delete(run.id);
            completedRuns.push(run);
            if (completedRuns.length > MAX_COMPLETED) {
                completedRuns.shift();
            }
            // Stop SWARM simulator when pipeline completes
            swarmSimulator.stop();
        });
        // Get the runId from the promise
        const run = await runPromise;
        res.json({
            runId: run.id,
            pipeline: run.pipeline,
            status: run.status,
            totalCost: run.totalCost,
            totalTokens: run.totalTokens,
            duration: run.completedAt
                ? Date.parse(run.completedAt) - Date.parse(run.startedAt)
                : null,
            nodes: run.nodes.map((n) => ({
                nodeId: n.nodeId,
                status: n.status,
                cost: n.cost,
                tokens: n.tokens,
                error: n.error,
            })),
        });
    }
    catch (err) {
        res.status(500).json({
            error: 'Pipeline execution failed',
            details: err instanceof Error ? err.message : String(err),
        });
    }
});
/**
 * POST /api/pipeline/create
 * Create a pipeline from natural language description.
 */
router.post('/create', async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name || !description) {
            res.status(400).json({ error: 'Missing required fields: name, description' });
            return;
        }
        // Validate pipeline name format
        try {
            validatePipelineName(name);
        }
        catch (err) {
            res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid pipeline name' });
            return;
        }
        const pipelineDef = generatePipeline(name, description);
        const yaml = serializePipelineYaml(pipelineDef);
        // Save to disk
        const { PipelineStore } = await import('@cortivex/core');
        const store = new PipelineStore();
        let savedPath;
        try {
            savedPath = await store.save(pipelineDef);
        }
        catch {
            // Non-fatal — pipeline was still generated
        }
        res.json({
            name: pipelineDef.name,
            description: pipelineDef.description,
            tags: pipelineDef.tags,
            estimated_cost: pipelineDef.estimated_cost,
            estimated_duration: pipelineDef.estimated_duration,
            nodes: pipelineDef.nodes,
            yaml,
            savedPath,
        });
    }
    catch (err) {
        res.status(500).json({
            error: 'Pipeline creation failed',
            details: err instanceof Error ? err.message : String(err),
        });
    }
});
/**
 * GET /api/pipeline/status/:runId
 * Get the status of a specific pipeline run.
 */
router.get('/status/:runId', (req, res) => {
    const { runId } = req.params;
    const active = activeRuns.get(runId);
    if (active) {
        res.json({
            runId: active.run.id,
            pipeline: active.run.pipeline,
            status: active.run.status,
            totalCost: active.run.totalCost,
            totalTokens: active.run.totalTokens,
            nodes: active.run.nodes,
        });
        return;
    }
    const completed = completedRuns.find((r) => r.id === runId);
    if (completed) {
        res.json({
            runId: completed.id,
            pipeline: completed.pipeline,
            status: completed.status,
            totalCost: completed.totalCost,
            totalTokens: completed.totalTokens,
            duration: completed.completedAt
                ? Date.parse(completed.completedAt) - Date.parse(completed.startedAt)
                : null,
            nodes: completed.nodes,
        });
        return;
    }
    res.status(404).json({ error: `Run "${runId}" not found` });
});
/**
 * GET /api/pipelines
 * List available pipelines.
 */
router.get('/', async (_req, res) => {
    try {
        const loader = new PipelineLoader();
        const pipelines = await loader.listPipelines();
        res.json({ pipelines });
    }
    catch (err) {
        res.status(500).json({
            error: 'Failed to list pipelines',
            details: err instanceof Error ? err.message : String(err),
        });
    }
});
/**
 * POST /api/pipeline/export/n8n
 * Export a pipeline as an n8n workflow JSON.
 */
router.post('/export/n8n', async (req, res) => {
    try {
        const { pipeline } = req.body;
        if (!pipeline) {
            res.status(400).json({ error: 'Missing required field: pipeline' });
            return;
        }
        // Validate pipeline name if it looks like a simple name
        if (!pipeline.includes('\n') && !pipeline.includes('{') && !pipeline.includes(':')) {
            try {
                validatePipelineName(pipeline);
            }
            catch (err) {
                res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid pipeline name' });
                return;
            }
        }
        const loader = new PipelineLoader();
        let pipelineDef;
        try {
            pipelineDef = await loader.load(pipeline);
        }
        catch {
            try {
                pipelineDef = loader.loadFromString(pipeline);
            }
            catch {
                res.status(404).json({ error: `Pipeline "${pipeline}" not found` });
                return;
            }
        }
        const n8nWorkflow = exportToN8n(pipelineDef);
        res.json(n8nWorkflow);
    }
    catch (err) {
        res.status(500).json({
            error: 'Export failed',
            details: err instanceof Error ? err.message : String(err),
        });
    }
});
export default router;
//# sourceMappingURL=pipeline.js.map