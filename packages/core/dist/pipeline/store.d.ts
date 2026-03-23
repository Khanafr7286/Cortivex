import type { PipelineDefinition } from '../types.js';
export declare class PipelineStore {
    private baseDir;
    constructor(baseDir?: string);
    private get pipelinesPath();
    private get templatesPath();
    /**
     * Ensure the .cortivex/pipelines/ directory exists.
     */
    ensureDir(): Promise<void>;
    /**
     * Save a pipeline definition to disk.
     */
    save(pipeline: PipelineDefinition): Promise<string>;
    /**
     * Load a pipeline by name.
     */
    load(name: string): Promise<PipelineDefinition>;
    /**
     * Load a pipeline from a raw YAML / JSON string.
     */
    loadFromString(raw: string): PipelineDefinition;
    /**
     * List saved pipelines.
     */
    listSaved(): Promise<Array<{
        name: string;
        description: string;
        path: string;
    }>>;
    /**
     * List built-in templates.
     */
    listTemplates(): Array<{
        name: string;
        description: string;
        tags: string[];
    }>;
    /**
     * List all pipelines (saved + templates).
     */
    listAll(): Promise<Array<{
        name: string;
        description: string;
        source: 'saved' | 'template';
    }>>;
}
//# sourceMappingURL=store.d.ts.map