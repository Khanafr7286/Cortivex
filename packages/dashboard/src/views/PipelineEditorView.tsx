import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  Play,
  Save,
  FileDown,
  LayoutTemplate,
  X,
  Trash2,
  Search,
  MousePointerClick,
} from 'lucide-react';
import { useCortivexStore } from '@/stores/cortivexStore';
import { NodeCard, NodeCardMini, NODE_WIDTH, NODE_HEIGHT } from '@/components/NodeCard';
import { ConnectionLine } from '@/components/ConnectionLine';
import { nodeTypesByCategory, nodeTypeCatalog } from '@/lib/demo-data';
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  MODEL_OPTIONS,
} from '@/lib/types';
import type { NodeCategory, PipelineNode, PipelineDefinition } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// ============================================
// PIPELINE EDITOR VIEW
// ============================================

export function PipelineEditorView() {
  const {
    editorNodes,
    editorConnections,
    editorPipelineName,
    selectedNode,
    isConfigPanelOpen,
    pipelines,
    selectNode,
    addEditorNode,
    addEditorConnection,
    moveEditorNode,
    updateEditorNode,
    removeEditorNode,
    removeEditorConnection,
    setEditorPipelineName,
    loadPipelineIntoEditor,
    runPipeline,
  } = useCortivexStore();

  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [nodeStart, setNodeStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // n8n-style connection dragging state
  const [connectDrag, setConnectDrag] = useState<{
    sourceNodeId: string;
    sourcePort: 'input' | 'output';
    mouseX: number;
    mouseY: number;
  } | null>(null);

  const selectedNodeData = editorNodes.find((n) => n.id === selectedNode);

  // Canvas zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.min(Math.max(transform.scale * delta, 0.3), 3);

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      setTransform((t) => ({
        x: mx - (mx - t.x) * (newScale / t.scale),
        y: my - (my - t.y) * (newScale / t.scale),
        scale: newScale,
      }));
    },
    [transform.scale],
  );

  // Canvas pan
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== e.currentTarget && !canvasRef.current?.contains(e.target as Node)) return;
      if (e.button !== 0) return;

      // Check if clicking on the SVG layer (not a node)
      const target = e.target as HTMLElement;
      if (target.closest('[data-node-card]')) return;

      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    },
    [transform.x, transform.y],
  );

  // Port drag start -- n8n style connection creation
  const handlePortMouseDown = useCallback(
    (nodeId: string, portType: 'input' | 'output', e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      setConnectDrag({
        sourceNodeId: nodeId,
        sourcePort: portType,
        mouseX: (e.clientX - rect.left - transform.x) / transform.scale,
        mouseY: (e.clientY - rect.top - transform.y) / transform.scale,
      });
    },
    [transform],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        setTransform((t) => ({
          ...t,
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        }));
      }

      if (dragNodeId) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const newX = nodeStart.x + (e.clientX - dragStart.x) / transform.scale;
        const newY = nodeStart.y + (e.clientY - dragStart.y) / transform.scale;
        moveEditorNode(dragNodeId, { x: newX, y: newY });
      }

      // Update connection drag cursor position
      if (connectDrag) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        setConnectDrag((prev) =>
          prev
            ? {
                ...prev,
                mouseX: (e.clientX - rect.left - transform.x) / transform.scale,
                mouseY: (e.clientY - rect.top - transform.y) / transform.scale,
              }
            : null,
        );
      }
    },
    [isDragging, dragNodeId, dragStart, nodeStart, transform, moveEditorNode, connectDrag],
  );

  // Find the closest port to a canvas-space position
  const findNearestPort = useCallback(
    (canvasX: number, canvasY: number, excludeNodeId: string) => {
      const HIT_RADIUS = 30; // pixels in canvas space
      let bestDist = HIT_RADIUS;
      let bestNodeId: string | null = null;
      let bestPortType: 'input' | 'output' | null = null;

      for (const node of editorNodes) {
        if (node.id === excludeNodeId) continue;

        // Input port position (left center)
        const inX = node.position.x;
        const inY = node.position.y + NODE_HEIGHT / 2;
        const inDist = Math.hypot(canvasX - inX, canvasY - inY);
        if (inDist < bestDist) {
          bestDist = inDist;
          bestNodeId = node.id;
          bestPortType = 'input';
        }

        // Output port position (right center)
        const outX = node.position.x + NODE_WIDTH;
        const outY = node.position.y + NODE_HEIGHT / 2;
        const outDist = Math.hypot(canvasX - outX, canvasY - outY);
        if (outDist < bestDist) {
          bestDist = outDist;
          bestNodeId = node.id;
          bestPortType = 'output';
        }
      }

      return bestNodeId && bestPortType ? { nodeId: bestNodeId, portType: bestPortType } : null;
    },
    [editorNodes],
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      // Handle connection drag completion
      if (connectDrag) {
        // Convert screen position to canvas space
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const canvasX = (e.clientX - rect.left - transform.x) / transform.scale;
          const canvasY = (e.clientY - rect.top - transform.y) / transform.scale;

          // Find nearest port within hit radius
          const target = findNearestPort(canvasX, canvasY, connectDrag.sourceNodeId);

          if (target) {
            // Normalize: always sourceId->targetId = output->input
            let sourceId: string;
            let targetId: string;

            if (connectDrag.sourcePort === 'output') {
              sourceId = connectDrag.sourceNodeId;
              targetId = target.nodeId;
            } else {
              sourceId = target.nodeId;
              targetId = connectDrag.sourceNodeId;
            }

            // Prevent duplicates and self-connections
            const exists = editorConnections.some(
              (c) => c.sourceId === sourceId && c.targetId === targetId,
            );
            if (!exists && sourceId !== targetId) {
              addEditorConnection({
                id: `conn-${Date.now()}`,
                sourceId,
                targetId,
                animated: false,
              });
            }
          }
        }

        setConnectDrag(null);
      }

      setIsDragging(false);
      setDragNodeId(null);
    },
    [connectDrag, editorConnections, addEditorConnection, transform, findNearestPort],
  );

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Node drag start
  const handleNodeDragStart = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const node = editorNodes.find((n) => n.id === nodeId);
      if (!node) return;
      setDragNodeId(nodeId);
      setDragStart({ x: e.clientX, y: e.clientY });
      setNodeStart({ x: node.position.x, y: node.position.y });
    },
    [editorNodes],
  );

  // Drop from palette
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const typeId = e.dataTransfer.getData('nodeTypeId');
      if (!typeId) return;

      const nodeType = nodeTypeCatalog.find((nt) => nt.id === typeId);
      if (!nodeType) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (e.clientX - rect.left - transform.x) / transform.scale;
      const y = (e.clientY - rect.top - transform.y) / transform.scale;

      const newNode: PipelineNode = {
        id: `${typeId}-${Date.now()}`,
        typeId: nodeType.id,
        name: nodeType.name,
        category: nodeType.category,
        icon: nodeType.icon,
        position: { x, y },
        model: nodeType.defaultModel,
        temperature: 0.3,
        instructions: '',
        dependsOn: [],
        condition: '',
        status: 'idle',
        progress: 0,
        output: '',
        duration: 0,
        cost: 0,
        tokensUsed: 0,
      };

      addEditorNode(newNode);
    },
    [transform, addEditorNode],
  );

  const handleCanvasDoubleClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  // Build node map for connections
  const nodeMap = new Map(editorNodes.map((n) => [n.id, n]));

  const canvasIsEmpty = editorNodes.length === 0;

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      {/* Left Panel -- Node Palette */}
      <NodePalette />

      {/* Center -- Canvas */}
      <div
        ref={canvasRef}
        className={cn(
          'flex-1 relative overflow-hidden bg-canvas-dark',
          connectDrag ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing',
        )}
        onWheel={handleWheel}
        onMouseDown={handleCanvasMouseDown}
        onDoubleClick={handleCanvasDoubleClick}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {/* n8n-style dot grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: `${20 * transform.scale}px ${20 * transform.scale}px`,
            backgroundPosition: `${transform.x}px ${transform.y}px`,
          }}
        />

        {/* Empty canvas hint */}
        {canvasIsEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex items-center gap-2 text-text-dim">
                <MousePointerClick size={20} className="opacity-40" />
              </div>
              <p className="text-sm text-text-dim/70 font-mono">
                Drag nodes from the palette or press{' '}
                <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-canvas-border/60 bg-surface-light/50 text-text-muted text-xs font-mono">
                  Ctrl+K
                </kbd>
                {' '}to search
              </p>
              <p className="text-[9px] text-text-dim/50 uppercase tracking-wider">
                Empty canvas
              </p>
            </div>
          </div>
        )}

        {/* Transform layer */}
        <div
          className="absolute"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
          }}
        >
          {/* SVG Connections Layer */}
          <svg
            className="absolute top-0 left-0 pointer-events-none"
            style={{ width: '4000px', height: '4000px', overflow: 'visible' }}
          >
            {editorConnections.map((conn) => {
              const source = nodeMap.get(conn.sourceId);
              const target = nodeMap.get(conn.targetId);
              if (!source || !target) return null;
              return (
                <ConnectionLine
                  key={conn.id}
                  sourceNode={source}
                  targetNode={target}
                />
              );
            })}

            {/* Temporary connection line while dragging from a port */}
            {connectDrag && (() => {
              const srcNode = nodeMap.get(connectDrag.sourceNodeId);
              if (!srcNode) return null;
              // Calculate the source port position
              const sx = connectDrag.sourcePort === 'output'
                ? srcNode.position.x + NODE_WIDTH
                : srcNode.position.x;
              const sy = srcNode.position.y + NODE_HEIGHT / 2;
              const tx = connectDrag.mouseX;
              const ty = connectDrag.mouseY;
              const dx = Math.abs(tx - sx);
              const cp = Math.max(dx * 0.5, 40);
              const d = `M ${sx} ${sy} C ${sx + (connectDrag.sourcePort === 'output' ? cp : -cp)} ${sy}, ${tx + (connectDrag.sourcePort === 'output' ? -cp : cp)} ${ty}, ${tx} ${ty}`;
              return (
                <path
                  d={d}
                  fill="none"
                  stroke="rgba(79, 142, 247, 0.6)"
                  strokeWidth={2}
                  strokeDasharray="6,4"
                  strokeLinecap="round"
                />
              );
            })()}
          </svg>

          {/* Nodes Layer */}
          {editorNodes.map((node) => (
            <div
              key={node.id}
              data-node-card
              className="absolute"
              style={{
                left: node.position.x,
                top: node.position.y,
              }}
            >
              <NodeCard
                node={node}
                selected={selectedNode === node.id}
                onSelect={selectNode}
                onStartDrag={handleNodeDragStart}
                onPortMouseDown={handlePortMouseDown}
              />
            </div>
          ))}
        </div>

        {/* Zoom indicator */}
        <div className="absolute bottom-16 right-4 text-[10px] font-mono text-text-muted bg-canvas-card/80 px-2.5 py-1 rounded-lg border border-canvas-border/50 backdrop-blur-sm">
          {Math.round(transform.scale * 100)}%
        </div>
      </div>

      {/* Right Panel -- Node Config */}
      <AnimatePresence>
        {isConfigPanelOpen && selectedNodeData && (
          <NodeConfigPanel
            node={selectedNodeData}
            allNodes={editorNodes}
            onUpdate={(updates) =>
              updateEditorNode(selectedNodeData.id, updates)
            }
            onDelete={() => removeEditorNode(selectedNodeData.id)}
            onClose={() => selectNode(null)}
          />
        )}
      </AnimatePresence>

      {/* Bottom Toolbar */}
      <BottomToolbar
        pipelineName={editorPipelineName}
        onNameChange={setEditorPipelineName}
        onRun={() => runPipeline(editorPipelineName)}
        onLoadPipeline={loadPipelineIntoEditor}
        pipelines={pipelines}
      />
    </div>
  );
}

// ============================================
// NODE PALETTE
// ============================================

function NodePalette() {
  const [expandedCategories, setExpandedCategories] = useState<
    Set<NodeCategory>
  >(new Set(['quality', 'security', 'testing']));

  const [searchQuery, setSearchQuery] = useState('');

  const toggleCategory = (category: NodeCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Filter nodes by search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return nodeTypesByCategory;

    const query = searchQuery.toLowerCase();
    const filtered: Partial<typeof nodeTypesByCategory> = {};
    for (const [category, nodes] of Object.entries(nodeTypesByCategory)) {
      const matchingNodes = nodes.filter(
        (node) =>
          node.name.toLowerCase().includes(query) ||
          node.category.toLowerCase().includes(query),
      );
      if (matchingNodes.length > 0) {
        (filtered as Record<string, typeof nodes>)[category] = matchingNodes;
      }
    }
    return filtered as typeof nodeTypesByCategory;
  }, [searchQuery]);

  return (
    <div className="w-[260px] h-full border-r border-canvas-border/40 bg-canvas-dark flex flex-col">
      {/* Header */}
      <div className="px-4 py-3">
        <h3 className="text-[11px] font-mono font-medium text-text-muted uppercase tracking-wider">
          Nodes
        </h3>
        <p className="text-[10px] text-text-dim mt-0.5">
          Drag to canvas
        </p>
      </div>

      <Separator className="opacity-60" />

      {/* Search */}
      <div className="px-3 py-3">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search nodes..."
            className="pl-8 h-8 bg-canvas-card/60 border-canvas-border/40 text-xs"
          />
        </div>
      </div>

      <Separator className="opacity-40" />

      {/* Categories */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {(Object.keys(filteredCategories) as NodeCategory[]).map(
          (category) => {
            const nodes = (filteredCategories as typeof nodeTypesByCategory)[category];
            if (!nodes || nodes.length === 0) return null;
            const isExpanded = expandedCategories.has(category) || searchQuery.trim().length > 0;
            const color = CATEGORY_COLORS[category];

            return (
              <div key={category}>
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-white/[0.04] active:bg-white/[0.06] transition-all duration-200 group"
                >
                  <div
                    className="w-2 h-2 rounded-full transition-transform duration-200 group-hover:scale-125"
                    style={{ backgroundColor: color, boxShadow: `0 0 0 2px var(--tw-ring-offset-color, #0B0D14), 0 0 0 4px ${color}40` }}
                  />
                  <span className="text-[11px] font-mono font-medium text-text-muted group-hover:text-text-primary flex-1 text-left uppercase tracking-wider transition-colors duration-200">
                    {CATEGORY_LABELS[category]}
                  </span>
                  <Badge variant="secondary" className="h-5 min-w-[22px] px-1.5 py-0 text-[9px] justify-center border-canvas-border/60">
                    {nodes.length}
                  </Badge>
                  <motion.div
                    animate={{ rotate: isExpanded ? 0 : -90 }}
                    transition={{ duration: 0.15 }}
                  >
                    <ChevronDown size={12} className="text-text-dim group-hover:text-text-muted transition-colors" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-1 pl-2 pr-1 py-1.5">
                        {nodes.map((nodeType) => (
                          <NodeCardMini
                            key={nodeType.id}
                            name={nodeType.name}
                            icon={nodeType.icon}
                            category={nodeType.category}
                            avgCost={nodeType.avgCost}
                            avgRuntime={nodeType.avgRuntime}
                            onDragStart={(e) => {
                              e.dataTransfer.setData(
                                'nodeTypeId',
                                nodeType.id,
                              );
                              e.dataTransfer.effectAllowed = 'copy';
                            }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          },
        )}

        {/* No results */}
        {searchQuery.trim().length > 0 &&
          Object.keys(filteredCategories).length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Search size={16} className="text-text-dim" />
              <p className="text-[10px] text-text-dim uppercase tracking-wider">
                No matching nodes
              </p>
            </div>
          )}
      </div>
    </div>
  );
}

// ============================================
// NODE CONFIG PANEL
// ============================================

function NodeConfigPanel({
  node,
  allNodes,
  onUpdate,
  onDelete,
  onClose,
}: {
  node: PipelineNode;
  allNodes: PipelineNode[];
  onUpdate: (updates: Partial<PipelineNode>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const categoryColor = CATEGORY_COLORS[node.category];
  const nodeType = nodeTypeCatalog.find((nt) => nt.id === node.typeId);
  const otherNodes = allNodes.filter((n) => n.id !== node.id);

  // Demo stats
  const stats = {
    successRate: 94 + Math.random() * 5,
    avgCost: nodeType?.avgCost || 0.5,
    avgDuration: nodeType?.avgRuntime || 120,
  };

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="w-[320px] h-full z-20"
    >
      <Card className="h-full rounded-none rounded-l-xl border-r-0 border-canvas-border/40 bg-canvas-dark/95 backdrop-blur-sm flex flex-col">
        {/* Header */}
        <CardHeader className="flex-row items-center justify-between space-y-0 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Badge
              className="h-5 px-2 py-0 text-[9px] border-0"
              style={{
                backgroundColor: `${categoryColor}20`,
                color: categoryColor,
              }}
            >
              {CATEGORY_LABELS[node.category]}
            </Badge>
            <h3 className="text-sm font-semibold text-text-primary">
              {node.name}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-text-muted hover:text-text-primary"
            onClick={onClose}
          >
            <X size={14} />
          </Button>
        </CardHeader>

        <Separator className="opacity-40" />

        {/* Config form */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Model Selector */}
          <div>
            <label className="text-[10px] font-mono text-text-muted uppercase tracking-wider block mb-2">
              Model
            </label>
            <select
              value={node.model}
              onChange={(e) => onUpdate({ model: e.target.value })}
              className="w-full bg-surface-light border border-canvas-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-cortivex-cyan/40 focus:outline-none focus:ring-2 focus:ring-cortivex-cyan/20 transition-all"
            >
              {MODEL_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} (${m.cost}/1k tok)
                </option>
              ))}
            </select>
          </div>

          {/* Temperature */}
          <div>
            <label className="text-[10px] font-mono text-text-muted uppercase tracking-wider block mb-2">
              Temperature: {node.temperature.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={node.temperature}
              onChange={(e) =>
                onUpdate({ temperature: parseFloat(e.target.value) })
              }
              className="w-full h-1.5 bg-canvas-border rounded-full appearance-none cursor-pointer accent-cortivex-cyan"
            />
            <div className="flex justify-between text-[9px] text-text-dim mt-1.5">
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>

          <Separator className="opacity-30" />

          {/* Custom Instructions */}
          <div>
            <label className="text-[10px] font-mono text-text-muted uppercase tracking-wider block mb-2">
              Custom Instructions
            </label>
            <textarea
              value={node.instructions}
              onChange={(e) => onUpdate({ instructions: e.target.value })}
              placeholder="Optional instructions for this node..."
              rows={3}
              className="w-full bg-surface-light border border-canvas-border rounded-lg px-3 py-2 text-xs font-mono text-text-primary focus:border-cortivex-cyan/40 focus:outline-none focus:ring-2 focus:ring-cortivex-cyan/20 resize-none transition-all placeholder:text-text-dim"
            />
          </div>

          {/* Depends On */}
          <div>
            <label className="text-[10px] font-mono text-text-muted uppercase tracking-wider block mb-2">
              Depends On
            </label>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {otherNodes.map((other) => (
                <label
                  key={other.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.04] cursor-pointer group transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={node.dependsOn.includes(other.id)}
                    onChange={(e) => {
                      const deps = e.target.checked
                        ? [...node.dependsOn, other.id]
                        : node.dependsOn.filter((d) => d !== other.id);
                      onUpdate({ dependsOn: deps });
                    }}
                    className="rounded accent-cortivex-cyan bg-canvas-card border-canvas-border"
                  />
                  <span className="text-xs text-text-muted group-hover:text-text-primary transition-colors">
                    {other.name}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Condition */}
          <div>
            <label className="text-[10px] font-mono text-text-muted uppercase tracking-wider block mb-2">
              Condition
            </label>
            <Input
              value={node.condition}
              onChange={(e) => onUpdate({ condition: e.target.value })}
              placeholder="e.g., files.length > 0"
              className="bg-surface-light text-xs font-mono"
            />
          </div>

          <Separator className="opacity-30" />

          {/* Stats */}
          <div>
            <h4 className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-3">
              Historical Stats
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg p-2.5 text-center bg-success-green/[0.06] border border-success-green/10">
                <div className="text-sm font-semibold text-success-green">
                  {stats.successRate.toFixed(0)}%
                </div>
                <div className="text-[9px] text-text-muted mt-1">Success</div>
              </div>
              <div className="rounded-lg p-2.5 text-center bg-warning-amber/[0.06] border border-warning-amber/10">
                <div className="text-sm font-semibold text-warning-amber">
                  ${stats.avgCost.toFixed(2)}
                </div>
                <div className="text-[9px] text-text-muted mt-1">Avg Cost</div>
              </div>
              <div className="rounded-lg p-2.5 text-center bg-cortivex-cyan/[0.06] border border-cortivex-cyan/10">
                <div className="text-sm font-semibold text-plasma-teal">
                  {Math.round(stats.avgDuration / 60)}m
                </div>
                <div className="text-[9px] text-text-muted mt-1">Avg Time</div>
              </div>
            </div>
          </div>

          {/* Delete */}
          <Button
            variant="destructive"
            className="w-full"
            onClick={onDelete}
          >
            <Trash2 size={14} />
            Delete Node
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================
// BOTTOM TOOLBAR
// ============================================

function BottomToolbar({
  pipelineName,
  onNameChange,
  onRun,
  onLoadPipeline,
  pipelines,
}: {
  pipelineName: string;
  onNameChange: (name: string) => void;
  onRun: () => void;
  onLoadPipeline: (pipeline: PipelineDefinition) => void;
  pipelines: PipelineDefinition[];
}) {
  const [showTemplates, setShowTemplates] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const [taskPrompt, setTaskPrompt] = useState('');

  return (
    <Card className="absolute bottom-2 left-[268px] right-2 rounded-xl border-canvas-border/50 bg-canvas-dark/95 backdrop-blur-md shadow-panel z-30">
      {/* Task input bar */}
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className="text-[10px] text-text-dim uppercase tracking-wider flex-shrink-0 font-mono">Task</span>
        <Input
          value={taskPrompt}
          onChange={(e) => setTaskPrompt(e.target.value)}
          placeholder="Describe what you want the agents to do... e.g. 'Add a /health endpoint that returns uptime and version'"
          className="flex-1 bg-canvas-card/50 border-canvas-border/40 text-sm h-8"
        />
      </div>

      <Separator className="opacity-30" />

      {/* Toolbar */}
      <div className="h-12 flex items-center px-4 gap-2">
        {/* Pipeline name */}
        <Input
          value={pipelineName}
          onChange={(e) => onNameChange(e.target.value)}
          className="bg-canvas-card/60 border-canvas-border/50 w-48 h-8 text-sm font-mono"
        />

        <div className="flex-1" />

        {/* Templates dropdown */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTemplates(!showTemplates)}
          >
            <LayoutTemplate size={14} />
            Templates
          </Button>
          {showTemplates && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-full mb-2 left-0 w-56 bg-canvas-card border border-canvas-border rounded-lg p-2 space-y-1 z-50 shadow-xl"
            >
              {pipelines.map((p) => (
                <button
                  key={p.name}
                  onClick={() => {
                    onLoadPipeline(p);
                    setShowTemplates(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-white/5 transition-colors"
                >
                  <div className="text-xs font-medium text-text-primary">
                    {p.name}
                  </div>
                  <div className="text-[10px] text-text-muted truncate">
                    {p.description}
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {/* Export dropdown */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowExport(!showExport)}
          >
            <FileDown size={14} />
            Export
          </Button>
          {showExport && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-full mb-2 right-0 w-40 bg-canvas-card border border-canvas-border rounded-lg p-2 space-y-1 z-50 shadow-xl"
            >
              {['YAML', 'JSON', 'n8n'].map((format) => (
                <button
                  key={format}
                  onClick={() => setShowExport(false)}
                  className="w-full text-left px-3 py-1.5 rounded-md hover:bg-white/5 transition-colors text-xs text-text-primary"
                >
                  Export as {format}
                </button>
              ))}
            </motion.div>
          )}
        </div>

        <Separator orientation="vertical" className="h-6 opacity-40" />

        {/* Save */}
        <Button variant="outline" size="sm">
          <Save size={14} />
          Save
          <kbd className="hidden sm:inline-flex ml-1 text-[9px] text-text-dim font-mono opacity-70">
            Ctrl+S
          </kbd>
        </Button>

        {/* Run */}
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button size="sm" onClick={onRun}>
            <Play size={14} fill="currentColor" />
            Run Pipeline
            <kbd className="hidden sm:inline-flex ml-1 text-[9px] font-mono opacity-70">
              Ctrl+Enter
            </kbd>
          </Button>
        </motion.div>
      </div>
    </Card>
  );
}
