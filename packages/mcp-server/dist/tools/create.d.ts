export interface CreateInput {
    name: string;
    description: string;
}
export declare function createTool(input: CreateInput): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=create.d.ts.map