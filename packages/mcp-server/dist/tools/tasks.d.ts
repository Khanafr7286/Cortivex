export interface TasksInput {
    status?: string;
}
export declare function tasksTool(input: TasksInput): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=tasks.d.ts.map