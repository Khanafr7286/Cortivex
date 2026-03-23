export interface HistoryInput {
    pipeline?: string;
    limit?: number;
}
export declare function historyTool(input: HistoryInput): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=history.d.ts.map