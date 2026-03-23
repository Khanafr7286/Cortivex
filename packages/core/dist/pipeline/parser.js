/**
 * Pipeline YAML / JSON parser and serializer.
 */
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
/**
 * Parse a YAML or JSON string into a PipelineDefinition.
 */
/** Maximum allowed YAML input length to prevent DoS via large payloads */
const MAX_YAML_LENGTH = 1024 * 1024; // 1MB
export function parsePipeline(raw) {
    if (!raw || typeof raw !== 'string') {
        throw new Error('Pipeline input must be a non-empty string');
    }
    if (raw.length > MAX_YAML_LENGTH) {
        throw new Error(`Pipeline input exceeds maximum allowed size of ${MAX_YAML_LENGTH} bytes`);
    }
    let data;
    // Try YAML first (superset of JSON)
    // Use maxAliasCount to prevent alias expansion attacks (billion laughs / YAML bombs)
    try {
        data = parseYaml(raw, { maxAliasCount: 100 });
    }
    catch {
        // Fall back to JSON
        try {
            data = JSON.parse(raw);
        }
        catch {
            throw new Error('Failed to parse pipeline: input is neither valid YAML nor JSON');
        }
    }
    return validatePipeline(data);
}
/**
 * Validate that a parsed object conforms to PipelineDefinition.
 */
function validatePipeline(data) {
    if (!data || typeof data !== 'object') {
        throw new Error('Pipeline definition must be an object');
    }
    const obj = data;
    if (typeof obj.name !== 'string' || obj.name.trim() === '') {
        throw new Error('Pipeline must have a non-empty "name" field');
    }
    if (!Array.isArray(obj.nodes) || obj.nodes.length === 0) {
        throw new Error('Pipeline must have at least one node in "nodes" array');
    }
    const seenIds = new Set();
    for (const node of obj.nodes) {
        if (!node || typeof node !== 'object') {
            throw new Error('Each node must be an object');
        }
        const n = node;
        if (typeof n.id !== 'string' || n.id.trim() === '') {
            throw new Error('Each node must have a non-empty "id"');
        }
        if (typeof n.type !== 'string' || n.type.trim() === '') {
            throw new Error(`Node "${n.id}" must have a non-empty "type"`);
        }
        if (seenIds.has(n.id)) {
            throw new Error(`Duplicate node id: "${n.id}"`);
        }
        seenIds.add(n.id);
        // Validate depends_on references
        if (Array.isArray(n.depends_on)) {
            for (const dep of n.depends_on) {
                if (typeof dep !== 'string') {
                    throw new Error(`depends_on entries must be strings (node "${n.id}")`);
                }
            }
        }
    }
    // Check that all depends_on targets exist
    for (const node of obj.nodes) {
        const n = node;
        if (Array.isArray(n.depends_on)) {
            for (const dep of n.depends_on) {
                if (!seenIds.has(dep)) {
                    throw new Error(`Node "${n.id}" depends on "${dep}" which does not exist`);
                }
            }
        }
    }
    return {
        name: obj.name,
        version: obj.version ?? '1.0.0',
        description: obj.description ?? '',
        tags: Array.isArray(obj.tags) ? obj.tags : [],
        estimated_cost: obj.estimated_cost ?? 'unknown',
        estimated_duration: obj.estimated_duration ?? 'unknown',
        nodes: obj.nodes,
    };
}
/**
 * Serialize a PipelineDefinition to YAML.
 */
export function serializePipelineYaml(pipeline) {
    return stringifyYaml(pipeline, { indent: 2 });
}
/**
 * Serialize a PipelineDefinition to JSON.
 */
export function serializePipelineJson(pipeline) {
    return JSON.stringify(pipeline, null, 2);
}
//# sourceMappingURL=parser.js.map