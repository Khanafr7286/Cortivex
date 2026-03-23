/**
 * cortivex_list — List available pipelines (saved, templates, or all).
 */
import { PipelineLoader } from '@cortivex/core';

export interface ListInput {
  type?: 'saved' | 'templates' | 'all';
}

export async function listTool(input: ListInput): Promise<{ content: Array<{ type: string; text: string }> }> {
  const loader = new PipelineLoader();
  const filter = input.type ?? 'all';

  const all = await loader.listPipelines();
  const sections: string[] = [];

  if (filter === 'saved' || filter === 'all') {
    const saved = all.filter((p) => p.source === 'user');
    if (saved.length > 0) {
      const lines = saved.map(
        (s) => `  - ${s.name}: ${s.description}\n    Tags: ${s.tags.join(', ')}, Nodes: ${s.nodeCount}`,
      );
      sections.push(`Saved Pipelines (${saved.length}):\n${lines.join('\n')}`);
    } else {
      sections.push('Saved Pipelines: none\n  Create one with cortivex_create or save a YAML file to .cortivex/pipelines/');
    }
  }

  if (filter === 'templates' || filter === 'all') {
    const templates = all.filter((p) => p.source === 'built-in');
    if (templates.length > 0) {
      const lines = templates.map(
        (t) => `  - ${t.name}: ${t.description}\n    Tags: ${t.tags.join(', ')}, Nodes: ${t.nodeCount}`,
      );
      sections.push(`Built-in Templates (${templates.length}):\n${lines.join('\n')}`);
    } else {
      sections.push('Built-in Templates: none');
    }
  }

  sections.push(`\nTotal: ${all.length} pipelines available`);

  return {
    content: [{ type: 'text', text: sections.join('\n\n') }],
  };
}
