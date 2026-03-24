export interface KnowledgeInput {
    query?: string;
    nodeType?: string;
    limit?: number;
}
export declare function knowledgeTool(input: KnowledgeInput): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=knowledge.d.ts.map