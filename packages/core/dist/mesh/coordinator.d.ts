/**
 * MeshCoordinator — manages file ownership, agent coordination, and
 * conflict detection for concurrent pipeline execution.
 */
import type { MeshState, MeshClaim, MeshConflict } from '../types.js';
declare class MeshCoordinatorSingleton {
    private claims;
    private conflicts;
    private lastCleanup;
    /**
     * Claim a set of files for an agent/node within a pipeline run.
     * Returns any conflicts detected.
     */
    claim(agentId: string, nodeId: string, pipelineRunId: string, files: string[]): MeshConflict[];
    /**
     * Release all claims held by an agent.
     */
    release(agentId: string): void;
    /**
     * Release all claims for a specific pipeline run.
     */
    releaseRun(pipelineRunId: string): void;
    /**
     * Get the current mesh state.
     */
    getState(): MeshState;
    /**
     * Get only active claims.
     */
    getActiveClaims(): MeshClaim[];
    /**
     * Get unresolved conflicts.
     */
    getConflicts(): MeshConflict[];
    /**
     * Get the agent currently owning a file.
     */
    getFileOwner(file: string): MeshClaim | undefined;
    /**
     * Clean up old completed claims (older than 1 hour).
     */
    cleanup(): void;
    /**
     * Reset all state (for testing).
     */
    reset(): void;
}
export declare const MeshCoordinator: MeshCoordinatorSingleton;
export {};
//# sourceMappingURL=coordinator.d.ts.map