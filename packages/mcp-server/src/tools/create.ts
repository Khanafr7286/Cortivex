/**
 * cortivex_create — Create a pipeline from natural language description.
 */
import {
  generatePipeline,
  PipelineStore,
  serializePipelineYaml,
} from '@cortivex/core';

export interface CreateInput {
  name: string;
  description: string;
}

export async function createTool(input: CreateInput): Promise<{ content: Array<{ type: string; text: string }> }> {
  if (!input.name || input.name.trim() === '') {
    return {
      content: [{
        type: 'text',
        text: 'Error: Pipeline name is required and must not be empty.',
      }],
    };
  }

  if (!input.description || input.description.trim() === '') {
    return {
      content: [{
        type: 'text',
        text: 'Error: Pipeline description is required. Describe what the pipeline should do in natural language.',
      }],
    };
  }

  // Generate pipeline from natural language
  const pipeline = generatePipeline(input.name, input.description);
  const yaml = serializePipelineYaml(pipeline);

  // Save to disk
  const store = new PipelineStore();
  let savedPath: string;
  try {
    savedPath = await store.save(pipeline);
  } catch (err) {
    return {
      content: [{
        type: 'text',
        text: `Pipeline generated successfully but could not be saved to disk:\n${err instanceof Error ? err.message : String(err)}\n\nGenerated YAML:\n${yaml}`,
      }],
    };
  }

  const nodeList = pipeline.nodes
    .map((n) => {
      const deps = n.depends_on && n.depends_on.length > 0
        ? ` (depends on: ${n.depends_on.join(', ')})`
        : '';
      return `  - ${n.id} [${n.type}]${deps}`;
    })
    .join('\n');

  const summary = [
    `Pipeline "${pipeline.name}" created successfully!`,
    ``,
    `Saved to: ${savedPath}`,
    `Description: ${pipeline.description}`,
    `Estimated Cost: ${pipeline.estimated_cost}`,
    `Estimated Duration: ${pipeline.estimated_duration}`,
    `Tags: ${pipeline.tags.join(', ')}`,
    ``,
    `Nodes:`,
    nodeList,
    ``,
    `--- Generated YAML ---`,
    yaml,
  ].join('\n');

  return {
    content: [{ type: 'text', text: summary }],
  };
}
