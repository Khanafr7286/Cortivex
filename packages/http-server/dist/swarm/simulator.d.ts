/**
 * SwarmSimulator — Broadcasts real pipeline node events as swarm consensus
 * events over WebSocket for dashboard visualization.
 *
 * When a pipeline runs, actual nodes (Code Reviewer, Security Scanner, etc.)
 * are treated as swarm agents. Leader election picks the first active node
 * as coordinator. Heartbeats reflect real token accumulation from Claude CLI.
 *
 * Events: bootstrap, election_started, vote_cast, leader_elected,
 * heartbeat, agent_died, agent_respawned, task_rebalanced,
 * knowledge_synced, quorum_check, conflict_resolved, shutdown
 */
export declare class SwarmSimulator {
    private agents;
    private term;
    private leaderId;
    private running;
    private heartbeatInterval;
    private quorumInterval;
    private electionInProgress;
    /**
     * Start the swarm with real pipeline node names.
     * @param nodeNames Array of actual pipeline node IDs/names
     */
    start(nodeNames: string[]): void;
    stop(): void;
    /**
     * Called when a real pipeline node starts executing.
     * Triggers leader election if no leader exists.
     */
    onNodeStart(nodeId: string, nodeType: string): void;
    /**
     * Called when a real pipeline node reports progress.
     */
    onNodeProgress(nodeId: string, progress: number, message: string): void;
    /**
     * Called when a real pipeline node completes successfully.
     */
    onNodeComplete(nodeId: string, cost: number, tokens: number): void;
    /**
     * Called when a real pipeline node fails.
     */
    onNodeFailed(nodeId: string, error: string): void;
    /**
     * Called when mesh conflict is detected.
     */
    onMeshConflict(file: string, claimedBy: string): void;
    /**
     * Leader election using actual pipeline nodes.
     * The candidate is a real running node, votes are based on node readiness.
     */
    private runElection;
    private sendHeartbeats;
    private checkQuorum;
    private findAgent;
}
export declare const swarmSimulator: SwarmSimulator;
//# sourceMappingURL=simulator.d.ts.map