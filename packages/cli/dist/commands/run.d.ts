interface RunOptions {
    dryRun?: boolean;
    verbose?: boolean;
    model?: string;
    parallel?: string;
    strategy?: string;
    retries?: string;
    learn?: boolean;
}
export declare function runCommand(pipelineName: string, options: RunOptions): Promise<void>;
export {};
//# sourceMappingURL=run.d.ts.map