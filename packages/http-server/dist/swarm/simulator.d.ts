/**
 * SwarmSimulator — Broadcasts realistic SWARM consensus events
 * over WebSocket during pipeline execution.
 *
 * Events: leader_elected, vote_cast, heartbeat, agent_died,
 * agent_respawned, task_rebalanced, knowledge_synced, quorum_check
 */
export declare class SwarmSimulator {
    private agents;
    private term;
    private leaderId;
    private running;
    private intervals;
    start(agentCount?: number): void;
    stop(): void;
    private runElection;
    private sendHeartbeats;
    private accumulateTokens;
    private killRandomAgent;
    private randomEvent;
}
export declare const swarmSimulator: SwarmSimulator;
//# sourceMappingURL=simulator.d.ts.map