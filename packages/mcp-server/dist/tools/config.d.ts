export interface ConfigInput {
    action: 'get' | 'set';
    key?: string;
    value?: unknown;
}
export declare function configTool(input: ConfigInput): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=config.d.ts.map