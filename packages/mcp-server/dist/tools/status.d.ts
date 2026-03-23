export interface StatusInput {
    runId?: string;
}
export declare function statusTool(input: StatusInput): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=status.d.ts.map