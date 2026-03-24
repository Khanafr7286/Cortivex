export interface AgentInput {
    agentId: string;
    runId?: string;
}
export declare function agentTool(input: AgentInput): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=agent.d.ts.map