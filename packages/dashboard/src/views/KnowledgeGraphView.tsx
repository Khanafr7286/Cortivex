import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { Search, X, ZoomIn, ZoomOut, Maximize2, Filter, GitBranch } from 'lucide-react';
import { useCortivexStore } from '@/stores/cortivexStore';
import type { Insight } from '@/lib/types';
// History is loaded by the store's fetchInitialData

// ============================================
// CORTIVEX KNOWLEDGE GRAPH VIEW
// ============================================

/* --- type palette --- */
const TYPE_COLORS: Record<string, string> = {
  file: '#4F8EF7',       // swarm-blue
  function: '#7B6EF6',   // neural-purple
  pattern: '#22d3ee',    // plasma-teal
  dependency: '#E8A44A', // warning-amber
  insight: '#3DD68C',    // success-green
};

const TYPE_SHAPES: Record<string, string> = {
  file: 'rect',
  function: 'hexagon',
  pattern: 'diamond',
  dependency: 'pentagon',
  insight: 'circle',
};

/* --- shape helpers --- */
function hexagonPath(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return `M${pts.join('L')}Z`;
}

function diamondPath(cx: number, cy: number, r: number): string {
  return `M${cx},${cy - r} L${cx + r},${cy} L${cx},${cy + r} L${cx - r},${cy} Z`;
}

function pentagonPath(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 5; i++) {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return `M${pts.join('L')}Z`;
}

function roundedRectPath(cx: number, cy: number, r: number): string {
  const w = r * 1.6;
  const h = r * 1.2;
  const cr = 4;
  const x = cx - w / 2;
  const y = cy - h / 2;
  return `M${x + cr},${y} L${x + w - cr},${y} Q${x + w},${y} ${x + w},${y + cr} L${x + w},${y + h - cr} Q${x + w},${y + h} ${x + w - cr},${y + h} L${x + cr},${y + h} Q${x},${y + h} ${x},${y + h - cr} L${x},${y + cr} Q${x},${y} ${x + cr},${y} Z`;
}

/* --- graph data types --- */
interface KnowledgeNode {
  id: string;
  label: string;
  type: string;
  properties: Record<string, string>;
  discoveredBy: string;
}

interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
  weight: number;
}

/* (demo graph removed — only real API data is used) */

/* --- simulation types --- */
interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: string;
  radius: number;
  color: string;
  properties: Record<string, string>;
  discoveredBy: string;
  connections: number;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  relation: string;
  weight: number;
}

/* --- build graph from real execution history + insights --- */
function buildGraphFromData(
  history: { pipelineName: string; nodesRun: number; success: boolean; cost: number; tokensUsed: number; duration: number; runNumber: number }[],
  insights: Insight[],
): { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] } | null {
  if (history.length === 0 && insights.length === 0) return null;

  const nodes: KnowledgeNode[] = [];
  const edges: KnowledgeEdge[] = [];
  const nodeIds = new Set<string>();

  // Create nodes from unique pipeline names
  const pipelineNames = [...new Set(history.map((r) => r.pipelineName))];
  for (const name of pipelineNames) {
    const id = `pipeline-${name}`;
    if (!nodeIds.has(id)) {
      nodeIds.add(id);
      const runs = history.filter((r) => r.pipelineName === name);
      const successRate = ((runs.filter((r) => r.success).length / runs.length) * 100).toFixed(0);
      const totalCost = runs.reduce((s, r) => s + r.cost, 0);
      nodes.push({
        id,
        label: name,
        type: 'pattern',
        properties: {
          runs: String(runs.length),
          successRate: `${successRate}%`,
          totalCost: `$${totalCost.toFixed(2)}`,
        },
        discoveredBy: 'ExecutionHistory',
      });
    }
  }

  // Create aggregated stats node when we have history
  if (history.length > 0) {
    const totalRuns = history.length;
    const successCount = history.filter((r) => r.success).length;
    const avgCost = history.reduce((s, r) => s + r.cost, 0) / totalRuns;

    const insightId = 'insight-overall';
    nodeIds.add(insightId);
    nodes.push({
      id: insightId,
      label: `${successCount}/${totalRuns} success`,
      type: 'insight',
      properties: {
        avgCost: `$${avgCost.toFixed(2)}`,
        totalRuns: String(totalRuns),
      },
      discoveredBy: 'LearningEngine',
    });

    // Connect pipelines to the insight node
    for (const name of pipelineNames) {
      edges.push({
        id: `edge-${name}-insight`,
        source: `pipeline-${name}`,
        target: insightId,
        relation: 'contributes_to',
        weight: 0.5,
      });
    }
  }

  // Create dependency edges between pipelines that ran in sequence (by runNumber proximity)
  if (pipelineNames.length > 1) {
    const sorted = [...history].sort((a, b) => a.runNumber - b.runNumber);
    const seenPairs = new Set<string>();
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (prev.pipelineName !== curr.pipelineName) {
        const pairKey = `${prev.pipelineName}::${curr.pipelineName}`;
        if (!seenPairs.has(pairKey)) {
          seenPairs.add(pairKey);
          edges.push({
            id: `edge-seq-${prev.pipelineName}-${curr.pipelineName}`,
            source: `pipeline-${prev.pipelineName}`,
            target: `pipeline-${curr.pipelineName}`,
            relation: 'followed_by',
            weight: 0.4,
          });
        }
      }
    }
  }

  // Add insight nodes from the learning API
  for (const insight of insights) {
    const id = `insight-${insight.id}`;
    if (!nodeIds.has(id)) {
      nodeIds.add(id);
      nodes.push({
        id,
        label: insight.pattern.length > 40 ? insight.pattern.slice(0, 38) + '...' : insight.pattern,
        type: 'insight',
        properties: {
          action: insight.action,
          confidence: `${(insight.confidence * 100).toFixed(0)}%`,
          basedOnRuns: String(insight.basedOnRuns),
          impact: insight.impact || 'N/A',
          category: insight.category || 'general',
        },
        discoveredBy: 'LearningEngine',
      });

      // Connect insights to relevant pipelines by category match
      for (const name of pipelineNames) {
        edges.push({
          id: `edge-insight-${insight.id}-${name}`,
          source: id,
          target: `pipeline-${name}`,
          relation: 'applies_to',
          weight: insight.confidence * 0.6,
        });
      }
    }
  }

  return { nodes, edges };
}

/* --- component --- */
export function KnowledgeGraphView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const nodeSelRef = useRef<d3.Selection<SVGGElement, SimNode, SVGGElement, unknown> | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [showEdgeLabels, setShowEdgeLabels] = useState(false);


  const { history: storeHistory, insights: storeInsights } = useCortivexStore();

  // Build graph from real API data only — no demo fallback
  const realGraph = useMemo(() => buildGraphFromData(storeHistory, storeInsights), [storeHistory, storeInsights]);

  const emptyGraph: { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] } = { nodes: [], edges: [] };
  const baseGraph = realGraph ?? emptyGraph;

  const displayGraph = useMemo(() => {
    if (!activeFilter) return baseGraph;
    const filteredNodes = baseGraph.nodes.filter((n) => n.type === activeFilter);
    const filteredIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = baseGraph.edges.filter(
      (e) => filteredIds.has(e.source) && filteredIds.has(e.target),
    );
    return { nodes: filteredNodes, edges: filteredEdges };
  }, [baseGraph, activeFilter]);

  const connectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const edge of displayGraph.edges) {
      counts[edge.source] = (counts[edge.source] || 0) + 1;
      counts[edge.target] = (counts[edge.target] || 0) + 1;
    }
    return counts;
  }, [displayGraph.edges]);

  const handleZoomIn = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.4);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 0.7);
    }
  }, []);

  const handleZoomFit = useCallback(() => {
    if (svgRef.current && zoomRef.current && gRef.current) {
      const svgEl = svgRef.current;
      const gEl = gRef.current.node();
      if (!gEl) return;
      const bounds = gEl.getBBox();
      const width = svgEl.clientWidth;
      const height = svgEl.clientHeight;
      const padding = 60;

      const scaleX = (width - padding * 2) / bounds.width;
      const scaleY = (height - padding * 2) / bounds.height;
      const scale = Math.min(scaleX, scaleY, 1.5);

      const tx = width / 2 - (bounds.x + bounds.width / 2) * scale;
      const ty = height / 2 - (bounds.y + bounds.height / 2) * scale;

      d3.select(svgEl)
        .transition()
        .duration(500)
        .call(zoomRef.current.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const svg = svgRef.current;
    if (!container || !svg) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const nodeCount = displayGraph.nodes.length;

    const svgSel = d3.select(svg).attr('width', width).attr('height', height);
    svgSel.selectAll('*').remove();

    /* defs */
    const defs = svgSel.append('defs');

    const glowFilter = defs
      .append('filter')
      .attr('id', 'kg-node-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    glowFilter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
    glowFilter.append('feFlood').attr('flood-color', '#4F8EF7').attr('flood-opacity', '0.1').attr('result', 'color');
    glowFilter.append('feComposite').attr('in', 'color').attr('in2', 'blur').attr('operator', 'in').attr('result', 'glow');
    const glowMerge = glowFilter.append('feMerge');
    glowMerge.append('feMergeNode').attr('in', 'glow');
    glowMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const brightFilter = defs
      .append('filter')
      .attr('id', 'kg-node-bright')
      .attr('x', '-80%')
      .attr('y', '-80%')
      .attr('width', '260%')
      .attr('height', '260%');
    brightFilter.append('feGaussianBlur').attr('stdDeviation', '6').attr('result', 'blur');
    brightFilter.append('feFlood').attr('flood-color', '#4F8EF7').attr('flood-opacity', '0.4').attr('result', 'color');
    brightFilter.append('feComposite').attr('in', 'color').attr('in2', 'blur').attr('operator', 'in').attr('result', 'glow');
    const brightMerge = brightFilter.append('feMerge');
    brightMerge.append('feMergeNode').attr('in', 'glow');
    brightMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    defs
      .append('marker')
      .attr('id', 'kg-arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-3L8,0L0,3')
      .attr('fill', '#1A1F2E');

    const g = svgSel.append('g');
    gRef.current = g;

    /* zoom / pan */
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 6])
      .on('zoom', (event) => g.attr('transform', event.transform));
    zoomRef.current = zoom;
    svgSel.call(zoom);

    /* adaptive forces */
    const chargeStrength = nodeCount <= 20 ? -350 : -500;
    const linkDistance = nodeCount <= 20 ? 120 : 160;

    /* build sim data */
    const simNodes: SimNode[] = displayGraph.nodes.map((n, i) => {
      const conns = connectionCounts[n.id] || 0;
      const angle = (2 * Math.PI * i) / displayGraph.nodes.length;
      const spread = Math.min(width, height) * 0.3;
      return {
        id: n.id,
        label: n.label,
        type: n.type,
        radius: Math.min(8 + conns * 3, 30),
        color: TYPE_COLORS[n.type] || '#5A6478',
        properties: n.properties,
        discoveredBy: n.discoveredBy,
        connections: conns,
        x: width / 2 + Math.cos(angle) * spread * (0.5 + Math.random() * 0.5),
        y: height / 2 + Math.sin(angle) * spread * (0.5 + Math.random() * 0.5),
      };
    });

    const nodeMap = new Map(simNodes.map((n) => [n.id, n]));
    const simLinks: SimLink[] = displayGraph.edges
      .filter((e) => nodeMap.has(e.source) && nodeMap.has(e.target))
      .map((e) => ({
        source: nodeMap.get(e.source)!,
        target: nodeMap.get(e.target)!,
        relation: e.relation,
        weight: e.weight,
      }));

    /* simulation */
    const simulation = d3
      .forceSimulation<SimNode>(simNodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance(linkDistance)
          .strength((d) => 0.3 + d.weight * 0.4),
      )
      .force('charge', d3.forceManyBody<SimNode>().strength(chargeStrength).distanceMax(500))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.08))
      .force(
        'collision',
        d3.forceCollide<SimNode>().radius((d) => d.radius + 15).strength(0.9),
      )
      .force('x', d3.forceX(width / 2).strength(0.03))
      .force('y', d3.forceY(height / 2).strength(0.03))
      .alphaDecay(0.02)
      .velocityDecay(0.4);

    /* links */
    const linkGroup = g.append('g').attr('class', 'links');
    const linkSel = linkGroup
      .selectAll('line')
      .data(simLinks)
      .enter()
      .append('line')
      .attr('stroke', (d) => {
        const srcColor = (d.source as SimNode).color;
        return srcColor + '40';
      })
      .attr('stroke-width', (d) => Math.max(0.5, d.weight * 1.5))
      .attr('stroke-opacity', 0.4)
      .attr('marker-end', (d) =>
        d.relation === 'depends_on' || d.relation === 'calls' || d.relation === 'imports'
          ? 'url(#kg-arrowhead)'
          : '',
      );

    /* edge labels */
    const edgeLabelSel = linkGroup
      .selectAll('text')
      .data(simLinks)
      .enter()
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('fill', '#5A6478')
      .attr('font-size', '7px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('opacity', showEdgeLabels ? 0.5 : 0)
      .attr('pointer-events', 'none')
      .text((d) => d.relation.replace(/_/g, ' '));

    /* nodes */
    const nodeGroup = g.append('g').attr('class', 'nodes');

    function drawShape(
      sel: d3.Selection<SVGGElement, SimNode, SVGGElement, unknown>,
      cls: string,
      filled: boolean,
    ) {
      sel.each(function (d) {
        const el = d3.select(this);
        const r = filled ? d.radius * 0.4 : d.radius;
        const fill = filled ? d.color : d.color + '15';
        const stroke = filled ? 'none' : d.color;
        const strokeWidth = filled ? 0 : 1.5;
        const opacity = filled ? 0.9 : 0.8;

        switch (TYPE_SHAPES[d.type] || 'circle') {
          case 'rect':
            el.append('path')
              .attr('class', cls)
              .attr('d', roundedRectPath(0, 0, r))
              .attr('fill', fill)
              .attr('stroke', stroke)
              .attr('stroke-width', strokeWidth)
              .attr('opacity', opacity);
            break;
          case 'hexagon':
            el.append('path')
              .attr('class', cls)
              .attr('d', hexagonPath(0, 0, r))
              .attr('fill', fill)
              .attr('stroke', stroke)
              .attr('stroke-width', strokeWidth)
              .attr('opacity', opacity);
            break;
          case 'diamond':
            el.append('path')
              .attr('class', cls)
              .attr('d', diamondPath(0, 0, r))
              .attr('fill', fill)
              .attr('stroke', stroke)
              .attr('stroke-width', strokeWidth)
              .attr('opacity', opacity);
            break;
          case 'pentagon':
            el.append('path')
              .attr('class', cls)
              .attr('d', pentagonPath(0, 0, r))
              .attr('fill', fill)
              .attr('stroke', stroke)
              .attr('stroke-width', strokeWidth)
              .attr('opacity', opacity);
            break;
          default:
            el.append('circle')
              .attr('class', cls)
              .attr('r', r)
              .attr('fill', fill)
              .attr('stroke', stroke)
              .attr('stroke-width', strokeWidth)
              .attr('opacity', opacity);
        }
      });
    }

    const nodeSel = nodeGroup
      .selectAll<SVGGElement, SimNode>('g')
      .data(simNodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .attr('filter', 'url(#kg-node-glow)');
    nodeSelRef.current = nodeSel;

    nodeSel
      .on('click', (_event, d) => {
        setSelectedNode((prev) => (prev?.id === d.id ? null : d));
      })
      .on('mouseenter', function (_, d) {
        linkSel
          .attr('stroke-opacity', (l) => {
            const src = (l.source as SimNode).id;
            const tgt = (l.target as SimNode).id;
            return src === d.id || tgt === d.id ? 0.8 : 0.1;
          })
          .attr('stroke-width', (l) => {
            const src = (l.source as SimNode).id;
            const tgt = (l.target as SimNode).id;
            return src === d.id || tgt === d.id ? Math.max(1.5, l.weight * 2.5) : Math.max(0.5, l.weight * 1.5);
          });
        edgeLabelSel.attr('opacity', (l) => {
          const src = (l.source as SimNode).id;
          const tgt = (l.target as SimNode).id;
          return src === d.id || tgt === d.id ? 0.8 : 0;
        });
        nodeSel.attr('opacity', (n) => {
          if (n.id === d.id) return 1;
          const connected = simLinks.some(
            (l) =>
              ((l.source as SimNode).id === d.id && (l.target as SimNode).id === n.id) ||
              ((l.target as SimNode).id === d.id && (l.source as SimNode).id === n.id),
          );
          return connected ? 1 : 0.2;
        });
      })
      .on('mouseleave', function () {
        linkSel.attr('stroke-opacity', 0.4).attr('stroke-width', (d) => Math.max(0.5, d.weight * 1.5));
        edgeLabelSel.attr('opacity', showEdgeLabels ? 0.5 : 0);
        nodeSel.attr('opacity', 1);
      })
      .call(
        d3
          .drag<SVGGElement, SimNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      );

    drawShape(nodeSel, 'outer-shape', false);
    drawShape(nodeSel, 'inner-core', true);

    /* labels */
    nodeSel
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => d.radius + 12)
      .attr('fill', '#CDD5E0')
      .attr('font-size', '10px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('opacity', 0.9)
      .attr('pointer-events', 'none')
      .text((d) => (d.label.length > 18 ? d.label.slice(0, 16) + '\u2026' : d.label));

    /* tick */
    let lastRenderTime = 0;
    const FRAME_INTERVAL = 1000 / 30;

    simulation.on('tick', () => {
      const now = performance.now();
      if (now - lastRenderTime < FRAME_INTERVAL) return;
      lastRenderTime = now;

      linkSel
        .attr('x1', (d) => (d.source as SimNode).x!)
        .attr('y1', (d) => (d.source as SimNode).y!)
        .attr('x2', (d) => (d.target as SimNode).x!)
        .attr('y2', (d) => (d.target as SimNode).y!);

      edgeLabelSel
        .attr('x', (d) => ((d.source as SimNode).x! + (d.target as SimNode).x!) / 2)
        .attr('y', (d) => ((d.source as SimNode).y! + (d.target as SimNode).y!) / 2);

      nodeSel.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    simulation.on('end', () => {
      setTimeout(handleZoomFit, 100);
    });

    /* resize */
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        svgSel.attr('width', w).attr('height', h);
        simulation.force('center', d3.forceCenter(w / 2, h / 2).strength(0.08));
        simulation.force('x', d3.forceX(w / 2).strength(0.03));
        simulation.force('y', d3.forceY(h / 2).strength(0.03));
        simulation.alpha(0.3).restart();
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      simulation.stop();
    };
  }, [displayGraph, connectionCounts, showEdgeLabels, handleZoomFit]);

  /* search highlight */
  useEffect(() => {
    const nodeSel = nodeSelRef.current;
    if (!nodeSel) return;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      nodeSel
        .attr('filter', (d) =>
          d.label.toLowerCase().includes(q) ? 'url(#kg-node-bright)' : 'url(#kg-node-glow)',
        )
        .attr('opacity', (d) => (d.label.toLowerCase().includes(q) ? 1 : 0.15));
    } else {
      nodeSel.attr('filter', 'url(#kg-node-glow)').attr('opacity', 1);
    }
  }, [searchQuery]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of displayGraph.nodes) {
      counts[n.type] = (counts[n.type] || 0) + 1;
    }
    return counts;
  }, [displayGraph.nodes]);

  // Empty state when no data is available
  if (!realGraph) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-canvas-dark" style={{ minHeight: 500 }}>
        <div className="bg-canvas-card border border-canvas-border rounded-2xl p-8 text-center max-w-md shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-cortivex-cyan/10 flex items-center justify-center mx-auto mb-4">
            <GitBranch size={28} className="text-cortivex-cyan" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            No Knowledge Graph Data
          </h3>
          <p className="text-sm text-text-muted">
            Run pipelines and collect insights to build the knowledge graph. Data is loaded from the execution history and learning insights APIs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full relative bg-canvas-dark"
      style={{ minHeight: 500 }}
    >
      {/* Search bar */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="backdrop-blur rounded-lg pl-8 pr-3 py-2 text-xs font-mono focus:outline-none w-56 bg-canvas-card/90 border border-canvas-border text-text-primary placeholder-text-muted"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 backdrop-blur rounded-lg px-4 py-2 flex items-center gap-4 bg-canvas-card/80 border border-canvas-border">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase text-text-muted">Nodes</span>
          <span className="text-xs font-mono font-semibold text-cortivex-cyan">
            {displayGraph.nodes.length}
          </span>
        </div>
        <div className="w-px h-4 bg-canvas-border" />
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase text-text-muted">Edges</span>
          <span className="text-xs font-mono font-semibold text-success-green">
            {displayGraph.edges.length}
          </span>
        </div>
      </div>

      {/* Type legend + filter */}
      <div className="absolute top-4 right-4 z-10 backdrop-blur rounded-lg p-3 bg-canvas-card/90 border border-canvas-border">
        <div className="text-[10px] font-mono uppercase tracking-wider mb-2 flex items-center justify-between text-text-muted">
          <span>Node Types</span>
          <Filter size={10} className="text-text-dim" />
        </div>
        <div className="flex flex-col gap-1">
          {(['file', 'function', 'pattern', 'dependency', 'insight'] as const).map((type) => {
            const color = TYPE_COLORS[type];
            const shapeChar: Record<string, string> = {
              file: '\u25AD',
              function: '\u2B21',
              pattern: '\u25C7',
              dependency: '\u2B1F',
              insight: '\u25CF',
            };
            const isActive = activeFilter === type;
            const count = typeCounts[type] || 0;
            return (
              <button
                key={type}
                onClick={() => setActiveFilter(isActive ? null : type)}
                className="flex items-center gap-2 text-xs rounded px-1.5 py-0.5 transition-colors"
                style={{
                  backgroundColor: isActive ? color + '20' : 'transparent',
                  border: isActive ? `1px solid ${color}40` : '1px solid transparent',
                }}
              >
                <span style={{ color, fontSize: '12px', lineHeight: 1 }}>{shapeChar[type]}</span>
                <span
                  className="capitalize flex-1 text-left"
                  style={{ color: isActive ? color : '#CDD5E0' }}
                >
                  {type}
                </span>
                <span className="font-mono text-[10px] text-text-dim">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-4 z-10 backdrop-blur rounded-lg p-2 flex items-center gap-1 bg-canvas-card/90 border border-canvas-border">
        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded hover:bg-white/5 transition-colors"
          title="Zoom in"
        >
          <ZoomIn size={14} className="text-text-primary" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded hover:bg-white/5 transition-colors"
          title="Zoom out"
        >
          <ZoomOut size={14} className="text-text-primary" />
        </button>
        <button
          onClick={handleZoomFit}
          className="p-1.5 rounded hover:bg-white/5 transition-colors"
          title="Fit to screen"
        >
          <Maximize2 size={14} className="text-text-primary" />
        </button>
        <div className="w-px h-5 mx-1 bg-canvas-border" />
        <button
          onClick={() => setShowEdgeLabels(!showEdgeLabels)}
          className="px-2 py-1 rounded text-[10px] font-mono transition-colors"
          style={{
            color: showEdgeLabels ? '#4F8EF7' : '#5A6478',
            backgroundColor: showEdgeLabels ? 'rgba(79,142,247,0.1)' : 'transparent',
          }}
          title="Toggle edge labels"
        >
          Labels
        </button>
      </div>

      {/* SVG canvas */}
      <div ref={containerRef} className="w-full h-full">
        <svg ref={svgRef} className="w-full h-full" />
      </div>

      {/* Detail panel */}
      {selectedNode && (
        <div className="absolute top-0 right-0 z-20 h-full overflow-y-auto w-[280px] bg-canvas-card border-l border-canvas-border animate-fade-in">
          <div className="p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-text-primary">
                {selectedNode.label}
              </h3>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-text-muted hover:text-text-primary"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider block mb-1 text-text-muted">
                  Type
                </span>
                <span
                  className="text-xs font-mono px-2 py-1 rounded"
                  style={{
                    color: selectedNode.color,
                    backgroundColor: selectedNode.color + '18',
                  }}
                >
                  {selectedNode.type}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider block mb-1 text-text-muted">
                  Discovered by
                </span>
                <span className="text-xs font-mono text-cortivex-cyan">
                  {selectedNode.discoveredBy}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider block mb-1 text-text-muted">
                  Connections
                </span>
                <span className="text-xs font-mono text-text-primary">
                  {selectedNode.connections}
                </span>
              </div>

              {Object.keys(selectedNode.properties).length > 0 && (
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider block mb-2 text-text-muted">
                    Properties
                  </span>
                  <div className="space-y-1.5">
                    {Object.entries(selectedNode.properties).map(([key, val]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between text-xs font-mono"
                      >
                        <span className="text-text-muted">{key}</span>
                        <span className="text-text-primary">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
