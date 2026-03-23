/**
 * N8n export — converts a Cortivex pipeline definition into an n8n
 * workflow JSON with HTTP Request nodes pointing at the Cortivex
 * HTTP server.
 */
import type { PipelineDefinition, NodeDefinition } from '../types.js';
import { nodeRegistry } from '../nodes/registry.js';

const CORTIVEX_HTTP_BASE = 'http://localhost:3939';

export interface N8nWorkflow {
  name: string;
  nodes: N8nNode[];
  connections: Record<string, N8nConnectionGroup>;
  active: boolean;
  settings: {
    executionOrder: string;
    saveManualExecutions: boolean;
    callerPolicy: string;
  };
  versionId: string;
  tags: Array<{ name: string }>;
}

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  color?: string;
}

export interface N8nConnectionGroup {
  main: Array<Array<{ node: string; type: string; index: number }>>;
}

/**
 * Convert a Cortivex pipeline definition to an n8n workflow JSON.
 */
export function exportToN8n(pipeline: PipelineDefinition): N8nWorkflow {
  const nodeMap = new Map<string, NodeDefinition>();
  for (const node of pipeline.nodes) {
    nodeMap.set(node.id, node);
  }

  // Build n8n nodes
  const n8nNodes: N8nNode[] = [];
  const connections: Record<string, N8nConnectionGroup> = {};

  // 1. Manual trigger node (start)
  const triggerNode: N8nNode = {
    id: 'trigger',
    name: 'Start Pipeline',
    type: 'n8n-nodes-base.manualTrigger',
    typeVersion: 1,
    position: [100, 300],
    parameters: {},
    color: '#FF6D5A',
  };
  n8nNodes.push(triggerNode);

  // 2. Layout: assign grid positions to nodes based on their dependency depth
  const depths = computeDepths(pipeline.nodes);
  const maxDepth = Math.max(...depths.values(), 0);

  // Group nodes by depth for row layout
  const byDepth = new Map<number, NodeDefinition[]>();
  for (const node of pipeline.nodes) {
    const d = depths.get(node.id) ?? 0;
    const list = byDepth.get(d) ?? [];
    list.push(node);
    byDepth.set(d, list);
  }

  // 3. Create an HTTP Request node for each Cortivex node
  for (const node of pipeline.nodes) {
    const depth = depths.get(node.id) ?? 0;
    const row = byDepth.get(depth)!;
    const rowIndex = row.indexOf(node);
    const rowSize = row.length;

    const x = 400 + depth * 300;
    const y = 300 + (rowIndex - (rowSize - 1) / 2) * 200;

    const meta = nodeRegistry.get(node.type);
    const color = meta?.color ?? '#909399';

    const n8nNode: N8nNode = {
      id: node.id,
      name: `${meta?.name ?? node.type} (${node.id})`,
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4,
      position: [x, y],
      parameters: {
        method: 'POST',
        url: `${CORTIVEX_HTTP_BASE}/api/pipeline/run`,
        sendBody: true,
        bodyParameters: {
          parameters: [
            {
              name: 'pipeline',
              value: pipeline.name,
            },
            {
              name: 'config',
              value: JSON.stringify({
                singleNode: node.id,
                nodeType: node.type,
                ...(node.config ?? {}),
              }),
            },
          ],
        },
        options: {
          timeout: 300000,
        },
      },
      color,
    };

    n8nNodes.push(n8nNode);
  }

  // 4. Add a "Pipeline Complete" notification node
  const completeNode: N8nNode = {
    id: 'pipeline-complete',
    name: 'Pipeline Complete',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4,
    position: [400 + (maxDepth + 1) * 300, 300],
    parameters: {
      method: 'GET',
      url: `${CORTIVEX_HTTP_BASE}/api/pipeline/status/{{$json.runId}}`,
      options: {},
    },
    color: '#00C853',
  };
  n8nNodes.push(completeNode);

  // 5. Build connections

  // Connect trigger to all root nodes (no dependencies)
  const rootNodes = pipeline.nodes.filter(
    (n) => !n.depends_on || n.depends_on.length === 0,
  );
  if (rootNodes.length > 0) {
    connections['Start Pipeline'] = {
      main: [
        rootNodes.map((n) => ({
          node: `${nodeRegistry.get(n.type)?.name ?? n.type} (${n.id})`,
          type: 'main',
          index: 0,
        })),
      ],
    };
  }

  // Connect nodes based on depends_on edges
  for (const node of pipeline.nodes) {
    if (node.depends_on && node.depends_on.length > 0) {
      for (const depId of node.depends_on) {
        const depNode = nodeMap.get(depId);
        if (!depNode) continue;
        const depMeta = nodeRegistry.get(depNode.type);
        const depName = `${depMeta?.name ?? depNode.type} (${depNode.id})`;

        if (!connections[depName]) {
          connections[depName] = { main: [[]] };
        }

        const meta = nodeRegistry.get(node.type);
        const nodeName = `${meta?.name ?? node.type} (${node.id})`;

        connections[depName].main[0].push({
          node: nodeName,
          type: 'main',
          index: 0,
        });
      }
    }
  }

  // Connect terminal nodes (nothing depends on them) to the complete node
  const terminalNodes = pipeline.nodes.filter((n) => {
    return !pipeline.nodes.some(
      (other) => other.depends_on?.includes(n.id),
    );
  });

  for (const tn of terminalNodes) {
    const meta = nodeRegistry.get(tn.type);
    const tnName = `${meta?.name ?? tn.type} (${tn.id})`;
    if (!connections[tnName]) {
      connections[tnName] = { main: [[]] };
    }
    connections[tnName].main[0].push({
      node: 'Pipeline Complete',
      type: 'main',
      index: 0,
    });
  }

  return {
    name: `Cortivex: ${pipeline.name}`,
    nodes: n8nNodes,
    connections,
    active: false,
    settings: {
      executionOrder: 'v1',
      saveManualExecutions: true,
      callerPolicy: 'workflowsFromSameOwner',
    },
    versionId: '1',
    tags: [{ name: 'cortivex' }, ...pipeline.tags.map((t) => ({ name: t }))],
  };
}

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Compute the topological depth of each node in the DAG.
 * Root nodes have depth 0.
 */
function computeDepths(nodes: NodeDefinition[]): Map<string, number> {
  const depths = new Map<string, number>();
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  function getDepth(nodeId: string, visited: Set<string>): number {
    if (depths.has(nodeId)) return depths.get(nodeId)!;
    if (visited.has(nodeId)) return 0; // cycle guard
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node || !node.depends_on || node.depends_on.length === 0) {
      depths.set(nodeId, 0);
      return 0;
    }

    const maxParent = Math.max(
      ...node.depends_on.map((dep) => getDepth(dep, visited)),
    );
    const d = maxParent + 1;
    depths.set(nodeId, d);
    return d;
  }

  for (const node of nodes) {
    getDepth(node.id, new Set());
  }

  return depths;
}
