/**
 * cortivex_export — Export a pipeline in various formats.
 */
import {
  PipelineLoader,
  exportToN8n,
  serializePipelineYaml,
  serializePipelineJson,
} from '@cortivex/core';

export interface ExportInput {
  pipeline: string;
  format: 'n8n' | 'yaml' | 'json';
}

export async function exportTool(input: ExportInput): Promise<{ content: Array<{ type: string; text: string }> }> {
  if (!input.pipeline || input.pipeline.trim() === '') {
    return {
      content: [{
        type: 'text',
        text: 'Error: Pipeline name is required.',
      }],
    };
  }

  const validFormats = ['n8n', 'yaml', 'json'] as const;
  if (!validFormats.includes(input.format)) {
    return {
      content: [{
        type: 'text',
        text: `Error: Invalid format "${input.format}". Supported formats: ${validFormats.join(', ')}`,
      }],
    };
  }

  const loader = new PipelineLoader();
  let pipelineDef;

  try {
    pipelineDef = await loader.load(input.pipeline);
  } catch {
    try {
      pipelineDef = loader.loadFromString(input.pipeline);
    } catch {
      return {
        content: [{
          type: 'text',
          text: `Error: Could not find or parse pipeline "${input.pipeline}". Use cortivex_list to see available pipelines.`,
        }],
      };
    }
  }

  let output: string;
  let formatLabel: string;

  switch (input.format) {
    case 'n8n': {
      const n8nWorkflow = exportToN8n(pipelineDef);
      output = JSON.stringify(n8nWorkflow, null, 2);
      formatLabel = 'n8n Workflow JSON';
      break;
    }
    case 'yaml': {
      output = serializePipelineYaml(pipelineDef);
      formatLabel = 'YAML';
      break;
    }
    case 'json': {
      output = serializePipelineJson(pipelineDef);
      formatLabel = 'JSON';
      break;
    }
  }

  return {
    content: [{
      type: 'text',
      text: `Pipeline "${pipelineDef.name}" exported as ${formatLabel}:\n\n${output}`,
    }],
  };
}
