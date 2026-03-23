export interface ListInput {
    type?: 'saved' | 'templates' | 'all';
}
export declare function listTool(input: ListInput): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=list.d.ts.map