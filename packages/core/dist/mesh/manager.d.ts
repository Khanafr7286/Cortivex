import type { MeshClaim, MeshConflict, MeshState } from '../types.js';
export declare class MeshManager {
    private readonly meshDir;
    private readonly writeQueue;
    private readonly QUEUE_CLEANUP_INTERVAL;
    private cleanupTimer?;
    constructor(baseDir?: string);
    /**
     * Atomic write operation with queue-based race condition prevention.
     */
    private atomicWrite;
    /**
     * Claim files for an agent. Writes a JSON file atomically.
     */
    claim(agentId: string, nodeId: string, pipelineRunId: string, files: string[]): Promise<MeshClaim>;
    /**
     * Release a claim by removing the agent's claim file.
     */
    release(agentId: string): Promise<void>;
    /**
     * Query all active mesh claims.
     */
    query(): Promise<MeshState>;
    /**
     * Check if any of the given files are already claimed by another agent.
     * Returns the first conflict found, or null if no conflicts.
     */
    checkConflict(files: string[]): Promise<MeshConflict | null>;
    /**
     * Remove claims older than the stale threshold (default: 30 minutes).
     */
    cleanup(): Promise<number>;
    /**
     * Update the status of an existing claim.
     */
    updateStatus(agentId: string, status: MeshClaim['status']): Promise<void>;
    /**
     * Get a specific agent's claim.
     */
    getClaim(agentId: string): Promise<MeshClaim | null>;
    /**
     * Clean up stale promises from writeQueue to prevent memory leaks
     */
    private cleanupStaleWrites;
    private ensureDir;
}
//# sourceMappingURL=manager.d.ts.map