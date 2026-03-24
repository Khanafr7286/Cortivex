export interface ScaleInput {
    poolSize: number;
    nodeType?: string;
}
export declare function scaleTool(input: ScaleInput): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=scale.d.ts.map