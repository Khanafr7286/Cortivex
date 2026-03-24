export interface StopInput {
    runId: string;
}
export declare function stopTool(input: StopInput): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=stop.d.ts.map