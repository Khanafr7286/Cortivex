/**
 * Pipeline YAML / JSON parser and serializer.
 */
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { PipelineDefinition } from '../types.js';

/**
 * Parse a YAML or JSON string into a PipelineDefinition.
 */
/** Maximum allowed YAML input length to prevent DoS via large payloads */
const MAX_YAML_LENGTH = 1024 * 1024; // 1MB

export function parsePipeline(raw: string): PipelineDefinition {
  if (!raw || typeof raw !== 'string') {
    throw new Error('Pipeline input must be a non-empty string');
  }
  if (raw.length > MAX_YAML_LENGTH) {
    throw new Error(`Pipeline input exceeds maximum allowed size of ${MAX_YAML_LENGTH} bytes`);
  }

  let data: unknown;

  // Try YAML first (superset of JSON)
  // Use maxAliasCount to prevent alias expansion attacks (billion laughs / YAML bombs)
  try {
    data = parseYaml(raw, { maxAliasCount: 100 });
  } catch {
    // Fall back to JSON
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error('Failed to parse pipeline: input is neither valid YAML nor JSON');
    }
  }

  return validatePipeline(data);
}

/**
 * Validate that a parsed object conforms to PipelineDefinition.
 */
function validatePipeline(data: unknown): PipelineDefinition {
  if (!data || typeof data !== 'object') {
    throw new Error('Pipeline definition must be an object');
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.name !== 'string' || obj.name.trim() === '') {
    throw new Error('Pipeline must have a non-empty "name" field');
  }

  if (!Array.isArray(obj.nodes) || obj.nodes.length === 0) {
    throw new Error('Pipeline must have at least one node in "nodes" array');
  }

  const seenIds = new Set<string>();
  for (const node of obj.nodes) {
    if (!node || typeof node !== 'object') {
      throw new Error('Each node must be an object');
    }
    const n = node as Record<string, unknown>;
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
    const n = node as Record<string, unknown>;
    if (Array.isArray(n.depends_on)) {
      for (const dep of n.depends_on as string[]) {
        if (!seenIds.has(dep)) {
          throw new Error(
            `Node "${n.id}" depends on "${dep}" which does not exist`,
          );
        }
      }
    }
  }

  return {
    name: obj.name as string,
    version: (obj.version as string) ?? '1.0.0',
    description: (obj.description as string) ?? '',
    tags: Array.isArray(obj.tags) ? (obj.tags as string[]) : [],
    estimated_cost: (obj.estimated_cost as string) ?? 'unknown',
    estimated_duration: (obj.estimated_duration as string) ?? 'unknown',
    nodes: obj.nodes as PipelineDefinition['nodes'],
  };
}

/**
 * Serialize a PipelineDefinition to YAML.
 */
export function serializePipelineYaml(pipeline: PipelineDefinition): string {
  return stringifyYaml(pipeline, { indent: 2 });
}

/**
 * Serialize a PipelineDefinition to JSON.
 */
export function serializePipelineJson(pipeline: PipelineDefinition): string {
  return JSON.stringify(pipeline, null, 2);
}
