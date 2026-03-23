/**
 * Mesh coordination REST endpoints.
 */
import { Router } from 'express';
import { MeshManager } from '@cortivex/core';

const router = Router();

/**
 * GET /api/mesh
 * Get current mesh state (claims, conflicts, agents).
 */
router.get('/', async (_req, res) => {
  try {
    const mesh = new MeshManager();
    const state = await mesh.query();

    const activeClaims = state.claims.filter((c) => c.status === 'active');
    const agentIds = [...new Set(activeClaims.map((c) => c.agentId))];

    // Build file ownership map
    const fileOwnership: Record<string, string> = {};
    for (const claim of activeClaims) {
      for (const file of claim.files) {
        fileOwnership[file] = claim.agentId;
      }
    }

    res.json({
      claims: activeClaims,
      agents: agentIds.map((id) => {
        const agentClaims = activeClaims.filter((c) => c.agentId === id);
        return {
          id,
          claimCount: agentClaims.length,
          fileCount: agentClaims.reduce((s, c) => s + c.files.length, 0),
          nodes: agentClaims.map((c) => c.nodeId),
        };
      }),
      conflicts: state.conflicts,
      fileOwnership,
      lastCleanup: state.lastCleanup,
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to query mesh state',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

/**
 * GET /api/mesh/conflicts
 * Get current conflicts only.
 */
router.get('/conflicts', async (_req, res) => {
  try {
    const mesh = new MeshManager();
    const state = await mesh.query();

    res.json({
      conflicts: state.conflicts,
      count: state.conflicts.length,
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to query conflicts',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;
