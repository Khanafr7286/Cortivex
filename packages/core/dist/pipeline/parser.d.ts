import type { PipelineDefinition } from '../types.js';
export declare function parsePipeline(raw: string): PipelineDefinition;
/**
 * Serialize a PipelineDefinition to YAML.
 */
export declare function serializePipelineYaml(pipeline: PipelineDefinition): string;
/**
 * Serialize a PipelineDefinition to JSON.
 */
export declare function serializePipelineJson(pipeline: PipelineDefinition): string;
//# sourceMappingURL=parser.d.ts.map