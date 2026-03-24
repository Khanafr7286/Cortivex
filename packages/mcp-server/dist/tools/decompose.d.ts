export interface DecomposeInput {
    description: string;
    maxDepth?: number;
}
export declare function decomposeTool(input: DecomposeInput): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=decompose.d.ts.map