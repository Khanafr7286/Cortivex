import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { HistoryRecorder } from '../learning/recorder.js';
import type { PipelineRun, ExecutionRecord } from '../types.js';

function makePipelineRun(overrides: Partial<PipelineRun> = {}): PipelineRun {
  return {
    id: 'run-001',
    pipeline: 'test-pipeline',
    status: 'completed',
    startedAt: '2025-06-01T10:00:00.000Z',
    completedAt: '2025-06-01T10:05:00.000Z',
    nodes: [
      {
        nodeId: 'node-a',
        status: 'completed',
        startedAt: '2025-06-01T10:00:00.000Z',
        completedAt: '2025-06-01T10:02:00.000Z',
        progress: 100,
        cost: 0.05,
        tokens: 1000,
        output: 'done',
        filesModified: ['file1.ts'],
      },
      {
        nodeId: 'node-b',
        status: 'completed',
        startedAt: '2025-06-01T10:02:00.000Z',
        completedAt: '2025-06-01T10:05:00.000Z',
        progress: 100,
        cost: 0.10,
        tokens: 2000,
        output: 'done',
        filesModified: ['file2.ts'],
      },
    ],
    totalCost: 0.15,
    totalTokens: 3000,
    filesModified: ['file1.ts', 'file2.ts'],
    ...overrides,
  };
}

describe('HistoryRecorder', () => {
  let tmpDir: string;
  let recorder: HistoryRecorder;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'cortivex-recorder-'));
    recorder = new HistoryRecorder(tmpDir);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe('record()', () => {
    it('writes a JSON file to the history directory', async () => {
      const run = makePipelineRun();
      const record = await recorder.record(run);

      // Verify the record was returned with correct fields
      expect(record.id).toBe('run-001');
      expect(record.pipeline).toBe('test-pipeline');
      expect(record.success).toBe(true);
      expect(record.totalCost).toBe(0.15);

      // Verify a file was written
      const historyDir = join(tmpDir, '.cortivex', 'history');
      const files = await readdir(historyDir);
      expect(files.length).toBe(1);
      expect(files[0]).toMatch(/\.json$/);

      // Verify file contents are valid JSON matching the record
      const content = await readFile(join(historyDir, files[0]), 'utf-8');
      const parsed = JSON.parse(content) as ExecutionRecord;
      expect(parsed.id).toBe('run-001');
      expect(parsed.pipeline).toBe('test-pipeline');
    });

    it('computes totalDuration from startedAt and completedAt', async () => {
      const run = makePipelineRun();
      const record = await recorder.record(run);

      // 10:00 to 10:05 = 300 seconds
      expect(record.totalDuration).toBe(300);
    });

    it('maps node results with correct fields', async () => {
      const run = makePipelineRun();
      const record = await recorder.record(run);

      expect(record.nodeResults).toHaveLength(2);
      expect(record.nodeResults[0].nodeId).toBe('node-a');
      expect(record.nodeResults[0].success).toBe(true);
      expect(record.nodeResults[0].cost).toBe(0.05);
      // Duration: 10:00 to 10:02 = 120 seconds
      expect(record.nodeResults[0].duration).toBe(120);
    });

    it('marks a failed run as success: false', async () => {
      const run = makePipelineRun({ status: 'failed' });
      const record = await recorder.record(run);

      expect(record.success).toBe(false);
    });
  });

  describe('getHistory()', () => {
    it('returns records sorted newest-first', async () => {
      const run1 = makePipelineRun({
        id: 'run-001',
        startedAt: '2025-06-01T10:00:00.000Z',
        completedAt: '2025-06-01T10:05:00.000Z',
      });
      const run2 = makePipelineRun({
        id: 'run-002',
        startedAt: '2025-06-02T10:00:00.000Z',
        completedAt: '2025-06-02T10:05:00.000Z',
      });

      await recorder.record(run1);
      await recorder.record(run2);

      const history = await recorder.getHistory();
      expect(history).toHaveLength(2);
      // Newest first (run-002 has a later timestamp)
      expect(history[0].id).toBe('run-002');
      expect(history[1].id).toBe('run-001');
    });

    it('returns an empty array when no history exists', async () => {
      const history = await recorder.getHistory();
      expect(history).toEqual([]);
    });

    it('filters by pipeline name when provided', async () => {
      const run1 = makePipelineRun({ id: 'run-001', pipeline: 'alpha' });
      const run2 = makePipelineRun({
        id: 'run-002',
        pipeline: 'beta',
        startedAt: '2025-06-02T10:00:00.000Z',
      });

      await recorder.record(run1);
      await recorder.record(run2);

      const filtered = await recorder.getHistory('alpha');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].pipeline).toBe('alpha');
    });
  });

  describe('getRuns()', () => {
    it('is an alias for getHistory and returns the same records', async () => {
      const run = makePipelineRun();
      await recorder.record(run);

      const history = await recorder.getHistory();
      const runs = await recorder.getRuns();

      expect(runs).toEqual(history);
    });
  });

  describe('getRunById()', () => {
    it('returns the matching record', async () => {
      const run = makePipelineRun({ id: 'find-me' });
      await recorder.record(run);

      const found = await recorder.getRunById('find-me');
      expect(found).not.toBeNull();
      expect(found!.id).toBe('find-me');
    });

    it('returns null for a non-existent run ID', async () => {
      const run = makePipelineRun({ id: 'exists' });
      await recorder.record(run);

      const found = await recorder.getRunById('does-not-exist');
      expect(found).toBeNull();
    });
  });

  describe('getStats()', () => {
    it('returns zero stats when no records exist', async () => {
      const stats = await recorder.getStats();

      expect(stats.totalRuns).toBe(0);
      expect(stats.successfulRuns).toBe(0);
      expect(stats.failedRuns).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.averageCost).toBe(0);
      expect(stats.totalCost).toBe(0);
      expect(stats.averageDuration).toBe(0);
      expect(stats.mostUsedPipeline).toBe('none');
    });

    it('computes correct aggregates across multiple runs', async () => {
      const run1 = makePipelineRun({
        id: 'r1',
        pipeline: 'alpha',
        status: 'completed',
        totalCost: 0.10,
        startedAt: '2025-06-01T10:00:00.000Z',
        completedAt: '2025-06-01T10:02:00.000Z',
      });
      const run2 = makePipelineRun({
        id: 'r2',
        pipeline: 'alpha',
        status: 'completed',
        totalCost: 0.20,
        startedAt: '2025-06-02T10:00:00.000Z',
        completedAt: '2025-06-02T10:04:00.000Z',
      });
      const run3 = makePipelineRun({
        id: 'r3',
        pipeline: 'beta',
        status: 'failed',
        totalCost: 0.30,
        startedAt: '2025-06-03T10:00:00.000Z',
        completedAt: '2025-06-03T10:06:00.000Z',
      });

      await recorder.record(run1);
      await recorder.record(run2);
      await recorder.record(run3);

      const stats = await recorder.getStats();

      expect(stats.totalRuns).toBe(3);
      expect(stats.successfulRuns).toBe(2);
      expect(stats.failedRuns).toBe(1);
      expect(stats.successRate).toBeCloseTo(2 / 3);
      expect(stats.totalCost).toBeCloseTo(0.60);
      expect(stats.averageCost).toBeCloseTo(0.20);
      expect(stats.mostUsedPipeline).toBe('alpha');
    });
  });

  describe('prune()', () => {
    it('deletes records older than the specified number of days', async () => {
      // Record an old run with a timestamp 60 days ago
      const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      const oldRun = makePipelineRun({
        id: 'old-run',
        startedAt: oldDate.toISOString(),
        completedAt: oldDate.toISOString(),
      });

      // Record a recent run
      const recentRun = makePipelineRun({
        id: 'recent-run',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });

      await recorder.record(oldRun);
      await recorder.record(recentRun);

      // Prune records older than 30 days
      const prunedCount = await recorder.prune(30);

      expect(prunedCount).toBe(1);

      const remaining = await recorder.getHistory();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('recent-run');
    });

    it('returns 0 when no records are old enough to prune', async () => {
      const run = makePipelineRun({
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
      await recorder.record(run);

      const prunedCount = await recorder.prune(30);
      expect(prunedCount).toBe(0);
    });
  });
});
