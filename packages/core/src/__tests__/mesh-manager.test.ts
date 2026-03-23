import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { MeshManager } from '../mesh/manager.js';

describe('MeshManager', () => {
  let tmpDir: string;
  let manager: MeshManager;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'cortivex-mesh-'));
    manager = new MeshManager(tmpDir);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe('claim()', () => {
    it('writes a claim file to the mesh directory', async () => {
      const claim = await manager.claim(
        'agent-1',
        'node-a',
        'run-001',
        ['file1.ts', 'file2.ts']
      );

      expect(claim.agentId).toBe('agent-1');
      expect(claim.nodeId).toBe('node-a');
      expect(claim.pipelineRunId).toBe('run-001');
      expect(claim.files).toEqual(['file1.ts', 'file2.ts']);
      expect(claim.status).toBe('active');

      // Verify the file was written on disk
      const meshDir = join(tmpDir, '.cortivex', 'mesh');
      const files = await readdir(meshDir);
      const jsonFiles = files.filter((f) => f.endsWith('.json'));
      expect(jsonFiles).toHaveLength(1);
      expect(jsonFiles[0]).toBe('agent-1.json');

      // Verify file content matches
      const content = await readFile(join(meshDir, 'agent-1.json'), 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.agentId).toBe('agent-1');
      expect(parsed.files).toEqual(['file1.ts', 'file2.ts']);
    });

    it('overwrites an existing claim for the same agent', async () => {
      await manager.claim('agent-1', 'node-a', 'run-001', ['file1.ts']);
      await manager.claim('agent-1', 'node-b', 'run-002', ['file2.ts']);

      const claim = await manager.getClaim('agent-1');
      expect(claim).not.toBeNull();
      expect(claim!.nodeId).toBe('node-b');
      expect(claim!.files).toEqual(['file2.ts']);
    });
  });

  describe('release()', () => {
    it('removes the claim file', async () => {
      await manager.claim('agent-1', 'node-a', 'run-001', ['file1.ts']);
      await manager.release('agent-1');

      const claim = await manager.getClaim('agent-1');
      expect(claim).toBeNull();
    });

    it('does not throw when releasing a non-existent agent', async () => {
      // Should not throw
      await expect(manager.release('non-existent')).resolves.toBeUndefined();
    });
  });

  describe('query()', () => {
    it('returns all active claims', async () => {
      await manager.claim('agent-1', 'node-a', 'run-001', ['file1.ts']);
      await manager.claim('agent-2', 'node-b', 'run-001', ['file2.ts']);

      const state = await manager.query();
      expect(state.claims).toHaveLength(2);

      const agentIds = state.claims.map((c) => c.agentId).sort();
      expect(agentIds).toEqual(['agent-1', 'agent-2']);
    });

    it('returns an empty state when no claims exist', async () => {
      const state = await manager.query();
      expect(state.claims).toHaveLength(0);
      expect(state.conflicts).toHaveLength(0);
    });

    it('detects conflicts when files are claimed by multiple agents', async () => {
      await manager.claim('agent-1', 'node-a', 'run-001', ['shared-file.ts']);
      await manager.claim('agent-2', 'node-b', 'run-001', ['shared-file.ts']);

      const state = await manager.query();
      expect(state.conflicts).toHaveLength(1);
      expect(state.conflicts[0].file).toBe('shared-file.ts');
    });
  });

  describe('checkConflict()', () => {
    it('detects when files are already claimed', async () => {
      await manager.claim('agent-1', 'node-a', 'run-001', ['file1.ts', 'file2.ts']);

      const conflict = await manager.checkConflict(['file2.ts', 'file3.ts']);
      expect(conflict).not.toBeNull();
      expect(conflict!.file).toBe('file2.ts');
      expect(conflict!.claimedBy).toBe('agent-1');
    });

    it('returns null when no conflicts exist', async () => {
      await manager.claim('agent-1', 'node-a', 'run-001', ['file1.ts']);

      const conflict = await manager.checkConflict(['file2.ts', 'file3.ts']);
      expect(conflict).toBeNull();
    });

    it('returns null when no claims exist at all', async () => {
      const conflict = await manager.checkConflict(['file1.ts']);
      expect(conflict).toBeNull();
    });
  });

  describe('cleanup()', () => {
    it('removes stale claims older than 30 minutes', async () => {
      // Create a claim, then manually backdate it
      await manager.claim('stale-agent', 'node-a', 'run-001', ['file1.ts']);

      // Overwrite the file with a stale timestamp
      const meshDir = join(tmpDir, '.cortivex', 'mesh');
      const claimPath = join(meshDir, 'stale-agent.json');
      const content = await readFile(claimPath, 'utf-8');
      const claim = JSON.parse(content);

      // Set claimedAt to 31 minutes ago
      const staleTime = new Date(Date.now() - 31 * 60 * 1000);
      claim.claimedAt = staleTime.toISOString();

      const { writeFile } = await import('node:fs/promises');
      await writeFile(claimPath, JSON.stringify(claim), 'utf-8');

      const removed = await manager.cleanup();
      expect(removed).toBe(1);

      // Verify the claim is gone
      const state = await manager.query();
      expect(state.claims).toHaveLength(0);
    });

    it('does not remove fresh claims', async () => {
      await manager.claim('fresh-agent', 'node-a', 'run-001', ['file1.ts']);

      const removed = await manager.cleanup();
      expect(removed).toBe(0);

      const state = await manager.query();
      expect(state.claims).toHaveLength(1);
    });

    it('returns 0 when the mesh directory is empty', async () => {
      const removed = await manager.cleanup();
      expect(removed).toBe(0);
    });
  });

  describe('sanitizeAgentId()', () => {
    it('rejects path traversal attempts', async () => {
      await expect(
        manager.claim('../../../etc/passwd', 'node-a', 'run-001', ['f.ts'])
      ).rejects.toThrow(/Agent ID may only contain/);
    });

    it('rejects empty agent IDs', async () => {
      await expect(
        manager.claim('', 'node-a', 'run-001', ['f.ts'])
      ).rejects.toThrow(/Agent ID must be a non-empty string/);
    });

    it('rejects agent IDs with slashes', async () => {
      await expect(
        manager.claim('agent/malicious', 'node-a', 'run-001', ['f.ts'])
      ).rejects.toThrow(/Agent ID may only contain/);
    });

    it('rejects excessively long agent IDs', async () => {
      const longId = 'a'.repeat(129);
      await expect(
        manager.claim(longId, 'node-a', 'run-001', ['f.ts'])
      ).rejects.toThrow(/Agent ID must not exceed 128 characters/);
    });

    it('accepts valid agent IDs with dots, hyphens, and underscores', async () => {
      const claim = await manager.claim(
        'agent-1_v2.0',
        'node-a',
        'run-001',
        ['f.ts']
      );
      expect(claim.agentId).toBe('agent-1_v2.0');
    });
  });
});
