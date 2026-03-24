/**
 * Pipeline REST endpoints.
 */
import { Router } from 'express';
import {
  PipelineExecutor,
  PipelineLoader,
  generatePipeline,
  serializePipelineYaml,
  exportToN8n,
  type PipelineRun,
} from '@cortivex/core';
import { attachExecutorEvents } from '../ws/handler.js';
import { swarmSimulator } from '../swarm/simulator.js';
import { validatePipelineName } from '../validation.js';

const router = Router();

// In-memory run tracking
const activeRuns = new Map<string, { run: PipelineRun; executor: PipelineExecutor }>();
const completedRuns: PipelineRun[] = [];
const MAX_COMPLETED = 200;

/**
 * POST /api/pipeline/run
 * Run a pipeline by name or inline definition.
 */
router.post('/run', async (req, res) => {
  try {
    const { pipeline, config } = req.body as {
      pipeline: string;
      config?: Record<string, unknown>;
    };

    if (!pipeline) {
      res.status(400).json({ error: 'Missing required field: pipeline' });
      return;
    }

    // If pipeline looks like a simple name (no whitespace/special chars), validate it
    if (!pipeline.includes('\n') && !pipeline.includes('{') && !pipeline.includes(':')) {
      try {
        validatePipelineName(pipeline);
      } catch (err) {
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
    } catch {
      // Pipeline not found by name — try parsing as inline YAML/JSON
      try {
        pipelineDef = loader.loadFromString(pipeline);
      } catch (parseErr) {
        res.status(404).json({
          error: `Could not find or parse pipeline "${pipeline}"`,
          details: parseErr instanceof Error ? parseErr.message : String(parseErr),
        });
        return;
      }
    }

    const options = {
      dryRun: (config?.dryRun as boolean) ?? false,
      failureStrategy: (config?.failureStrategy as 'stop' | 'continue' | 'retry') ?? 'continue',
      parallelism: (config?.parallelism as number) ?? 4,
      verbose: (config?.verbose as boolean) ?? false,
      timeout: (config?.timeout as number) ?? 300000,
    };

    // Start SWARM simulator with REAL pipeline node names
    if (!options.dryRun && pipelineDef.nodes) {
      const nodeNames = pipelineDef.nodes.map((n: any) => n.id || n.type || 'unknown');
      swarmSimulator.start(nodeNames);

      // Wire real executor events to the simulator
      executor.on('node:start', (nodeId, nodeType) => {
        swarmSimulator.onNodeStart(nodeId, nodeType);
      });
      executor.on('node:progress', (nodeId, progress, message) => {
        swarmSimulator.onNodeProgress(nodeId, progress, message);
      });
      executor.on('node:complete', (nodeId, state) => {
        swarmSimulator.onNodeComplete(nodeId, state.cost, state.tokens);
      });
      executor.on('node:failed', (nodeId, error) => {
        swarmSimulator.onNodeFailed(nodeId, error);
      });
      executor.on('mesh:conflict', (file, claimedBy) => {
        swarmSimulator.onMeshConflict(file, claimedBy);
      });
    }

    // Get runId immediately when pipeline starts
    let runId: string = '';
    let initialRun: PipelineRun | null = null;

    executor.once('pipeline:start', (id, _pipelineName) => {
      runId = id;
      // Create initial run state for immediate tracking
      initialRun = {
        id: runId,
        pipeline: pipelineDef.name,
        status: 'running',
        startedAt: new Date().toISOString(),
        nodes: pipelineDef.nodes.map((n: any) => ({
          nodeId: n.id,
          status: 'pending',
          progress: 0,
          cost: 0,
          tokens: 0,
          output: '',
          filesModified: [],
        })),
        totalCost: 0,
        totalTokens: 0,
        filesModified: [],
      };
      // Track immediately in activeRuns
      activeRuns.set(runId, { run: initialRun, executor });
    });

    // Start execution (don't await — return runId immediately)
    const runPromise = executor.execute(pipelineDef, options);

    // Track completion asynchronously
    runPromise.then((run) => {
      activeRuns.delete(run.id);
      completedRuns.push(run);
      if (completedRuns.length > MAX_COMPLETED) {
        completedRuns.shift();
      }
      // Stop SWARM simulator when pipeline completes
      swarmSimulator.stop();
    }).catch((error) => {
      // Handle execution errors by moving failed run to completed
      if (initialRun) {
        initialRun.status = 'failed';
        initialRun.completedAt = new Date().toISOString();
        activeRuns.delete(initialRun.id);
        completedRuns.push(initialRun);
        if (completedRuns.length > MAX_COMPLETED) {
          completedRuns.shift();
        }
      }
      swarmSimulator.stop();
    });

    // Wait briefly for pipeline:start event to fire
    await new Promise(resolve => setTimeout(resolve, 10));

    if (!initialRun || !runId) {
      throw new Error('Failed to initialize pipeline run');
    }

    const run = initialRun as PipelineRun;
    res.json({
      runId: runId,
      pipeline: run.pipeline,
      status: run.status,
      totalCost: run.totalCost,
      totalTokens: run.totalTokens,
      duration: null,
      nodes: run.nodes.map((n: any) => ({
        nodeId: n.nodeId,
        status: n.status,
        cost: n.cost,
        tokens: n.tokens,
        error: n.error,
      })),
    });
  } catch (err) {
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
    const { name, description } = req.body as {
      name: string;
      description: string;
    };

    if (!name || !description) {
      res.status(400).json({ error: 'Missing required fields: name, description' });
      return;
    }

    // Validate pipeline name format
    try {
      validatePipelineName(name);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid pipeline name' });
      return;
    }

    const pipelineDef = generatePipeline(name, description);
    const yaml = serializePipelineYaml(pipelineDef);

    // Save to disk
    const { PipelineStore } = await import('@cortivex/core');
    const store = new PipelineStore();
    let savedPath: string | undefined;
    try {
      savedPath = await store.save(pipelineDef);
    } catch (err) {
      // Non-fatal — pipeline was still generated, but log so operators notice persistence failures
      console.error('Failed to save pipeline to disk:', err instanceof Error ? err.message : err);
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
  } catch (err) {
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
 * GET /api/pipeline
 * List available pipelines.
 */
router.get('/', async (_req, res) => {
  try {
    const loader = new PipelineLoader(process.cwd());
    const pipelines = await loader.listPipelines();
    res.json(pipelines);
  } catch (err) {
    console.error('Failed to list pipelines:', err instanceof Error ? err.message : err);
    res.json([]);
  }
});

/**
 * POST /api/pipeline/export/n8n
 * Export a pipeline as an n8n workflow JSON.
 */
router.post('/export/n8n', async (req, res) => {
  try {
    const { pipeline } = req.body as { pipeline: string };

    if (!pipeline) {
      res.status(400).json({ error: 'Missing required field: pipeline' });
      return;
    }

    // Validate pipeline name if it looks like a simple name
    if (!pipeline.includes('\n') && !pipeline.includes('{') && !pipeline.includes(':')) {
      try {
        validatePipelineName(pipeline);
      } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid pipeline name' });
        return;
      }
    }

    const loader = new PipelineLoader();
    let pipelineDef;
    try {
      pipelineDef = await loader.load(pipeline);
    } catch {
      // Pipeline not found by name — try parsing as inline YAML/JSON
      try {
        pipelineDef = loader.loadFromString(pipeline);
      } catch {
        res.status(404).json({ error: `Pipeline "${pipeline}" not found` });
        return;
      }
    }

    const n8nWorkflow = exportToN8n(pipelineDef);
    res.json(n8nWorkflow);
  } catch (err) {
    res.status(500).json({
      error: 'Export failed',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;
