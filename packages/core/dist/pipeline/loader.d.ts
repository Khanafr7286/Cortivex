import type { PipelineDefinition, PipelineTemplate } from '../types.js';
export declare class PipelineLoader {
    private readonly baseDir;
    constructor(baseDir?: string);
    private get pipelinesDir();
    load(name: string): Promise<PipelineDefinition>;
    loadFromString(yamlContent: string): PipelineDefinition;
    validate(pipeline: PipelineDefinition): ValidationResult;
    private detectCycle;
    listPipelines(): Promise<PipelineInfo[]>;
    listTemplates(): PipelineTemplate[];
    getTemplate(id: string): PipelineTemplate | undefined;
}
export interface PipelineInfo {
    name: string;
    description: string;
    source: 'built-in' | 'user';
    tags: string[];
    nodeCount: number;
}
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
//# sourceMappingURL=loader.d.ts.map