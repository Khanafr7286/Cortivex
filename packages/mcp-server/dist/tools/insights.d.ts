export interface InsightsInput {
    pipeline?: string;
}
export declare function insightsTool(input: InsightsInput): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=insights.d.ts.map