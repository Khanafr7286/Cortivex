export interface ExportInput {
    pipeline: string;
    format: 'n8n' | 'yaml' | 'json';
}
export declare function exportTool(input: ExportInput): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=export.d.ts.map