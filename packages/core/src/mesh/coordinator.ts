/**
 * MeshCoordinator — manages file ownership, agent coordination, and
 * conflict detection for concurrent pipeline execution.
 */
import type { MeshState, MeshClaim, MeshConflict } from '../types.js';

class MeshCoordinatorSingleton {
  private claims: MeshClaim[] = [];
  private conflicts: MeshConflict[] = [];
  private lastCleanup: string = new Date().toISOString();

  /**
   * Claim a set of files for an agent/node within a pipeline run.
   * Returns any conflicts detected.
   */
  claim(
    agentId: string,
    nodeId: string,
    pipelineRunId: string,
    files: string[],
  ): MeshConflict[] {
    const newConflicts: MeshConflict[] = [];
    const now = new Date().toISOString();

    for (const file of files) {
      // Check for existing active claims on this file
      const existing = this.claims.find(
        (c) => c.files.includes(file) && c.status === 'active' && c.agentId !== agentId,
      );

      if (existing) {
        const conflict: MeshConflict = {
          file,
          claimedBy: existing.agentId,
          requestedBy: agentId,
          timestamp: now,
        };
        newConflicts.push(conflict);
        this.conflicts.push(conflict);
      }
    }

    // Register the claim regardless of conflicts
    this.claims.push({
      agentId,
      nodeId,
      pipelineRunId,
      files,
      status: 'active',
      claimedAt: now,
      lastUpdate: now,
    });

    return newConflicts;
  }

  /**
   * Release all claims held by an agent.
   */
  release(agentId: string): void {
    for (const claim of this.claims) {
      if (claim.agentId === agentId && claim.status === 'active') {
        claim.status = 'completed';
        claim.lastUpdate = new Date().toISOString();
      }
    }
  }

  /**
   * Release all claims for a specific pipeline run.
   */
  releaseRun(pipelineRunId: string): void {
    for (const claim of this.claims) {
      if (claim.pipelineRunId === pipelineRunId && claim.status === 'active') {
        claim.status = 'completed';
        claim.lastUpdate = new Date().toISOString();
      }
    }
  }

  /**
   * Get the current mesh state.
   */
  getState(): MeshState {
    return {
      claims: [...this.claims],
      conflicts: [...this.conflicts],
      lastCleanup: this.lastCleanup,
    };
  }

  /**
   * Get only active claims.
   */
  getActiveClaims(): MeshClaim[] {
    return this.claims.filter((c) => c.status === 'active');
  }

  /**
   * Get unresolved conflicts.
   */
  getConflicts(): MeshConflict[] {
    return [...this.conflicts];
  }

  /**
   * Get the agent currently owning a file.
   */
  getFileOwner(file: string): MeshClaim | undefined {
    return this.claims.find(
      (c) => c.files.includes(file) && c.status === 'active',
    );
  }

  /**
   * Clean up old completed claims (older than 1 hour).
   */
  cleanup(): void {
    const cutoff = Date.now() - 60 * 60 * 1000;
    this.claims = this.claims.filter((c) => {
      if (c.status !== 'active') {
        return Date.parse(c.lastUpdate) > cutoff;
      }
      return true;
    });
    this.lastCleanup = new Date().toISOString();
  }

  /**
   * Reset all state (for testing).
   */
  reset(): void {
    this.claims = [];
    this.conflicts = [];
    this.lastCleanup = new Date().toISOString();
  }
}

// Export a singleton instance
export const MeshCoordinator = new MeshCoordinatorSingleton();
