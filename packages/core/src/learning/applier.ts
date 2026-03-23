import type {
  PipelineDefinition,
  Insight,
  NodeDefinition,
} from '../types.js';
import { nodeRegistry } from '../nodes/registry.js';

export interface AppliedChange {
  insight: Insight;
  description: string;
  applied: boolean;
  reason?: string;
}

export class InsightApplier {
  /**
   * Apply insights to a pipeline, returning a modified pipeline and a log of changes.
   * Does not mutate the original pipeline.
   */
  apply(
    pipeline: PipelineDefinition,
    insights: Insight[]
  ): { pipeline: PipelineDefinition; changes: AppliedChange[] } {
    // Deep clone the pipeline to avoid mutation
    let modified: PipelineDefinition = structuredClone(pipeline);
    const changes: AppliedChange[] = [];

    // Sort insights by confidence descending — apply highest confidence first
    const sorted = [...insights].sort(
      (a, b) => b.confidence - a.confidence
    );

    for (const insight of sorted) {
      // Only apply insights above a minimum confidence threshold
      if (insight.confidence < 0.6) {
        changes.push({
          insight,
          description: `Skipped: confidence ${(insight.confidence * 100).toFixed(0)}% below 60% threshold`,
          applied: false,
          reason: 'low_confidence',
        });
        continue;
      }

      switch (insight.action) {
        case 'reorder': {
          const result = this.applyReorder(modified, insight);
          modified = result.pipeline;
          changes.push(result.change);
          break;
        }
        case 'substitute_model': {
          const result = this.applyModelSubstitution(modified, insight);
          modified = result.pipeline;
          changes.push(result.change);
          break;
        }
        case 'skip_node': {
          const result = this.applySkipNode(modified, insight);
          modified = result.pipeline;
          changes.push(result.change);
          break;
        }
        case 'add_node': {
          const result = this.applyAddNode(modified, insight);
          modified = result.pipeline;
          changes.push(result.change);
          break;
        }
      }
    }

    return { pipeline: modified, changes };
  }

  private applyReorder(
    pipeline: PipelineDefinition,
    insight: Insight
  ): { pipeline: PipelineDefinition; change: AppliedChange } {
    const modified = structuredClone(pipeline);
    const suggestedOrder = insight.details['suggestedOrder'] as
      | string[]
      | undefined;

    if (!suggestedOrder || suggestedOrder.length < 2) {
      return {
        pipeline: modified,
        change: {
          insight,
          description: 'No suggested order provided',
          applied: false,
          reason: 'missing_details',
        },
      };
    }

    // Find the nodes that match the suggested types
    const nodeIndices: { index: number; type: string }[] = [];
    for (const suggestedType of suggestedOrder) {
      const idx = modified.nodes.findIndex((n) => n.type === suggestedType);
      if (idx >= 0) {
        nodeIndices.push({ index: idx, type: suggestedType });
      }
    }

    if (nodeIndices.length < 2) {
      return {
        pipeline: modified,
        change: {
          insight,
          description: `Could not find nodes of types ${suggestedOrder.join(', ')} in pipeline`,
          applied: false,
          reason: 'nodes_not_found',
        },
      };
    }

    // Reorder: ensure the first suggested type appears before the second
    const firstNode = modified.nodes[nodeIndices[0].index];
    const secondNode = modified.nodes[nodeIndices[1].index];

    if (nodeIndices[0].index > nodeIndices[1].index) {
      // Swap positions
      modified.nodes[nodeIndices[0].index] = secondNode;
      modified.nodes[nodeIndices[1].index] = firstNode;

      // Update dependencies: remove dependency of first on second if it exists
      if (firstNode.depends_on) {
        firstNode.depends_on = firstNode.depends_on.filter(
          (d) => d !== secondNode.id
        );
      }

      return {
        pipeline: modified,
        change: {
          insight,
          description: `Reordered: "${firstNode.id}" (${firstNode.type}) now runs before "${secondNode.id}" (${secondNode.type})`,
          applied: true,
        },
      };
    }

    return {
      pipeline: modified,
      change: {
        insight,
        description: `Nodes already in suggested order: "${firstNode.id}" before "${secondNode.id}"`,
        applied: false,
        reason: 'already_optimal',
      },
    };
  }

  private applyModelSubstitution(
    pipeline: PipelineDefinition,
    insight: Insight
  ): { pipeline: PipelineDefinition; change: AppliedChange } {
    const modified = structuredClone(pipeline);
    const nodeType = insight.details['nodeType'] as string | undefined;
    const suggestedModel = insight.details['suggestedModel'] as
      | string
      | undefined;

    if (!nodeType || !suggestedModel) {
      return {
        pipeline: modified,
        change: {
          insight,
          description: 'Missing nodeType or suggestedModel in insight details',
          applied: false,
          reason: 'missing_details',
        },
      };
    }

    // Find nodes of the specified type and override their model
    const affectedNodes = modified.nodes.filter((n) => n.type === nodeType);

    if (affectedNodes.length === 0) {
      return {
        pipeline: modified,
        change: {
          insight,
          description: `No nodes of type "${nodeType}" found in pipeline`,
          applied: false,
          reason: 'nodes_not_found',
        },
      };
    }

    for (const node of affectedNodes) {
      if (!node.config) {
        node.config = {};
      }
      node.config['model'] = suggestedModel;
    }

    const costSavings = insight.details['costSavings'] ?? 'unknown';

    return {
      pipeline: modified,
      change: {
        insight,
        description: `Substituted model to "${suggestedModel}" for ${affectedNodes.length} "${nodeType}" node(s) — estimated ${costSavings} cost savings`,
        applied: true,
      },
    };
  }

  private applySkipNode(
    pipeline: PipelineDefinition,
    insight: Insight
  ): { pipeline: PipelineDefinition; change: AppliedChange } {
    const modified = structuredClone(pipeline);
    const nodeType = insight.details['nodeType'] as string | undefined;

    if (!nodeType) {
      return {
        pipeline: modified,
        change: {
          insight,
          description: 'Missing nodeType in insight details',
          applied: false,
          reason: 'missing_details',
        },
      };
    }

    // Find nodes of the specified type
    const nodesToSkip = modified.nodes.filter((n) => n.type === nodeType);

    if (nodesToSkip.length === 0) {
      return {
        pipeline: modified,
        change: {
          insight,
          description: `No nodes of type "${nodeType}" found in pipeline`,
          applied: false,
          reason: 'nodes_not_found',
        },
      };
    }

    // Add a condition to skip the node rather than removing it
    // This preserves the DAG structure while effectively skipping execution
    for (const node of nodesToSkip) {
      node.condition = `__insight_skip__`;
      if (!node.config) {
        node.config = {};
      }
      node.config['_skippedByInsight'] = insight.id;
      node.config['_skipReason'] = insight.description;
    }

    // Update dependencies: any node that depends on skipped nodes
    // should instead depend on the skipped node's dependencies
    const skippedIds = new Set(nodesToSkip.map((n) => n.id));
    for (const node of modified.nodes) {
      if (node.depends_on) {
        const newDeps: string[] = [];
        for (const dep of node.depends_on) {
          if (skippedIds.has(dep)) {
            // Replace with the skipped node's own dependencies
            const skippedNode = nodesToSkip.find((n) => n.id === dep);
            if (skippedNode?.depends_on) {
              newDeps.push(
                ...skippedNode.depends_on.filter((d) => !skippedIds.has(d))
              );
            }
          } else {
            newDeps.push(dep);
          }
        }
        node.depends_on = [...new Set(newDeps)];
        if (node.depends_on.length === 0) {
          delete node.depends_on;
        }
      }
    }

    return {
      pipeline: modified,
      change: {
        insight,
        description: `Marked ${nodesToSkip.length} "${nodeType}" node(s) for skipping — ${insight.description}`,
        applied: true,
      },
    };
  }

  private applyAddNode(
    pipeline: PipelineDefinition,
    insight: Insight
  ): { pipeline: PipelineDefinition; change: AppliedChange } {
    const modified = structuredClone(pipeline);
    const suggestedNodeType = insight.details['suggestedNode'] as
      | string
      | undefined;

    if (!suggestedNodeType) {
      return {
        pipeline: modified,
        change: {
          insight,
          description: 'Missing suggestedNode in insight details',
          applied: false,
          reason: 'missing_details',
        },
      };
    }

    // Verify the node type exists
    if (!nodeRegistry.has(suggestedNodeType)) {
      return {
        pipeline: modified,
        change: {
          insight,
          description: `Unknown node type "${suggestedNodeType}"`,
          applied: false,
          reason: 'unknown_node_type',
        },
      };
    }

    // Check if the node type already exists in the pipeline
    const alreadyExists = modified.nodes.some(
      (n) => n.type === suggestedNodeType
    );
    if (alreadyExists) {
      return {
        pipeline: modified,
        change: {
          insight,
          description: `Node type "${suggestedNodeType}" already exists in pipeline`,
          applied: false,
          reason: 'already_exists',
        },
      };
    }

    // Generate a unique node ID
    let nodeId = suggestedNodeType;
    let counter = 2;
    while (modified.nodes.some((n) => n.id === nodeId)) {
      nodeId = `${suggestedNodeType}-${counter}`;
      counter++;
    }

    // Determine where to insert the node
    // For security nodes, insert at the beginning
    // For other nodes, insert before the first node that can use its output
    const newNode: NodeDefinition = {
      id: nodeId,
      type: suggestedNodeType,
      config: {
        _addedByInsight: insight.id,
        _addReason: insight.description,
      },
    };

    if (suggestedNodeType.includes('security')) {
      // Insert at the beginning — no dependencies
      modified.nodes.unshift(newNode);
    } else {
      // Insert at the end, depending on the last independent batch
      const rootNodes = modified.nodes.filter(
        (n) => !n.depends_on || n.depends_on.length === 0
      );
      if (rootNodes.length > 0) {
        newNode.depends_on = rootNodes.map((n) => n.id);
      }
      modified.nodes.push(newNode);
    }

    return {
      pipeline: modified,
      change: {
        insight,
        description: `Added "${suggestedNodeType}" node as "${nodeId}" — ${insight.description}`,
        applied: true,
      },
    };
  }
}
