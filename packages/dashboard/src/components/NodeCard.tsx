import { useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Eye, Wrench, CheckCircle, Shield, Package, Key,
  FlaskConical, Play, Bug, Workflow, Container,
  FileText, ScrollText, Layers, Trash2, BarChart3, Network,
  X,
} from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/types';
import type { PipelineNode, NodeCategory } from '@/lib/types';
import clsx from 'clsx';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const iconMap: Record<string, React.ComponentType<any>> = {
  Eye, Wrench, CheckCircle, Shield, Package, Key,
  FlaskConical, Play, Bug, Workflow, Container,
  FileText, ScrollText, Layers, Trash2, BarChart3, Network,
};

// SWARM-style status config
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  idle: { label: 'IDLE', color: '#5A6478' },
  pending: { label: 'PENDING', color: '#5A6478' },
  running: { label: 'RUNNING', color: '#4F8EF7' },
  completed: { label: 'DONE', color: '#3DD68C' },
  failed: { label: 'FAILED', color: '#E05C5C' },
  skipped: { label: 'SKIPPED', color: '#E8A44A' },
};

export const NODE_WIDTH = 240;
export const NODE_HEIGHT = 110;
export const PORT_RADIUS = 6;

interface NodeCardProps {
  node: PipelineNode;
  selected: boolean;
  onSelect: (nodeId: string) => void;
  onStartDrag?: (nodeId: string, e: React.MouseEvent) => void;
  onPortMouseDown?: (nodeId: string, portType: 'input' | 'output', e: React.MouseEvent) => void;
  showPorts?: boolean;
  className?: string;
}

export function NodeCard({
  node,
  selected,
  onSelect,
  onStartDrag,
  onPortMouseDown,
  showPorts = true,
  className,
}: NodeCardProps) {
  const categoryColor = CATEGORY_COLORS[node.category];
  const categoryLabel = CATEGORY_LABELS[node.category as NodeCategory] || node.category;
  const Icon = iconMap[node.icon] || Workflow;
  const status = STATUS_CONFIG[node.status] || STATUS_CONFIG.idle;
  const modelShort = node.model.replace('claude-', '').replace('gpt-', '').replace('-latest', '');

  const handlePortDown = useCallback(
    (portType: 'input' | 'output', e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onPortMouseDown?.(node.id, portType, e);
    },
    [node.id, onPortMouseDown],
  );

  const borderColor = selected ? 'rgba(79,142,247,0.3)' : '#1A1F2E';

  return (
    <motion.div
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
      onClick={() => onSelect(node.id)}
      onMouseDown={(e) => {
        // Skip node drag if clicking on a port (port handles its own mouseDown)
        const target = e.target as HTMLElement;
        if (target.closest('[data-port-node-id]')) return;
        if (e.button === 0 && onStartDrag) {
          onStartDrag(node.id, e);
        }
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{
        opacity: node.status === 'pending' ? 0.55 : 1,
        scale: 1,
      }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.25 }}
    >
      <div
        className={clsx(
          'relative select-none cursor-pointer group w-full h-full',
          'rounded-xl',
          node.status === 'failed' && 'animate-shake',
          className,
        )}
        style={{
          background: '#12151E',
          borderTop: `1px solid ${borderColor}`,
          borderRight: `1px solid ${borderColor}`,
          borderBottom: `1px solid ${borderColor}`,
          borderLeft: `3px solid ${categoryColor}`,
          borderRadius: '12px',
          boxShadow: selected
            ? `0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(79,142,247,0.1), 0 0 20px ${categoryColor}15`
            : '0 2px 12px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)',
          transition: 'box-shadow 0.2s, border-color 0.2s',
        }}
      >
      {/* Header row: icon + name + category badge */}
      <div className="flex items-center gap-2.5 px-3.5 pt-3">
        <div
          className={clsx(
            'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
            node.status === 'running' && 'animate-icon-pulse',
          )}
          style={{
            backgroundColor: `${categoryColor}18`,
            boxShadow: `0 0 12px ${categoryColor}10`,
          }}
        >
          <Icon size={18} color={categoryColor} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold text-text-primary truncate font-mono leading-tight">
            {node.name}
          </div>
          <div className="text-[9px] text-text-dim font-mono truncate mt-0.5">
            {modelShort}
          </div>
        </div>
        {/* Category badge */}
        <div
          className="text-[7px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 rounded flex-shrink-0"
          style={{
            backgroundColor: `${categoryColor}15`,
            color: categoryColor,
          }}
        >
          {categoryLabel.substring(0, 4)}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-3.5 mt-2 mb-1.5 border-t border-canvas-border/60" />

      {/* Bottom row: status + cost/time */}
      <div className="px-3.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div
            className="w-[5px] h-[5px] rounded-full flex-shrink-0"
            style={{
              backgroundColor: status.color,
              boxShadow: node.status === 'running' ? `0 0 6px ${status.color}` : 'none',
            }}
          />
          <span
            className="text-[9px] font-mono font-medium uppercase tracking-wider"
            style={{ color: status.color }}
          >
            {status.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {node.status === 'running' && node.progress > 0 && (
            <span className="text-[9px] font-mono text-cortivex-cyan font-medium">
              {node.progress}%
            </span>
          )}
          {node.status === 'completed' && node.cost > 0 && (
            <span className="text-[9px] font-mono text-warning-amber">
              ${node.cost.toFixed(3)}
            </span>
          )}
          {node.status === 'completed' && node.duration > 0 && (
            <span className="text-[9px] font-mono text-text-dim">
              {node.duration.toFixed(1)}s
            </span>
          )}
        </div>
      </div>

      {/* Progress bar (runs across full bottom) */}
      {node.status === 'running' && node.progress > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-canvas-border/40 rounded-b-xl overflow-hidden">
          <motion.div
            className="h-full rounded-b-xl"
            style={{ backgroundColor: categoryColor }}
            initial={{ width: '0%' }}
            animate={{ width: `${node.progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {/* Completed badge */}
      {node.status === 'completed' && (
        <motion.div
          className="absolute -top-2 -right-2 z-20"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        >
          <div className="w-5 h-5 rounded-full bg-success-green flex items-center justify-center shadow-glow-green">
            <CheckCircle size={12} className="text-white" />
          </div>
        </motion.div>
      )}

      {/* Failed badge */}
      {node.status === 'failed' && (
        <motion.div
          className="absolute -top-2 -right-2 z-20"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          <div className="w-5 h-5 rounded-full bg-error-coral flex items-center justify-center shadow-glow-red">
            <X size={12} className="text-white" />
          </div>
        </motion.div>
      )}

      {/* n8n-style Ports — larger, more visible, interactive */}
      {showPorts && (
        <>
          {/* Input port (left center) */}
          <div
            data-port-node-id={node.id}
            data-port-type="input"
            className="absolute top-1/2 -translate-y-1/2 z-10"
            style={{ left: -PORT_RADIUS }}
          >
            <div
              className="rounded-full cursor-crosshair transition-all duration-150 hover:scale-150 group-hover:border-cortivex-cyan/50"
              style={{
                width: PORT_RADIUS * 2,
                height: PORT_RADIUS * 2,
                backgroundColor: '#0B0D14',
                border: '2px solid #353D4F',
              }}
              data-port-node-id={node.id}
              data-port-type="input"
              onMouseDown={(e) => handlePortDown('input', e)}
            />
          </div>

          {/* Output port (right center) — with + indicator on hover */}
          <div
            data-port-node-id={node.id}
            data-port-type="output"
            className="absolute top-1/2 -translate-y-1/2 z-10"
            style={{ right: -PORT_RADIUS }}
          >
            <div
              className="rounded-full cursor-crosshair transition-all duration-150 hover:scale-150 hover:bg-cortivex-cyan/20 hover:border-cortivex-cyan/60 group-hover:border-cortivex-cyan/50"
              style={{
                width: PORT_RADIUS * 2,
                height: PORT_RADIUS * 2,
                backgroundColor: '#0B0D14',
                border: '2px solid #353D4F',
              }}
              data-port-node-id={node.id}
              data-port-type="output"
              onMouseDown={(e) => handlePortDown('output', e)}
            />
          </div>
        </>
      )}
      </div>
    </motion.div>
  );
}

// Mini version for palette (drag from sidebar)
export function NodeCardMini({
  name,
  icon,
  category,
  avgCost,
  avgRuntime,
  onDragStart,
}: {
  name: string;
  icon: string;
  category: string;
  avgCost: number;
  avgRuntime: number;
  onDragStart: (e: React.DragEvent) => void;
}) {
  const categoryColor = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || '#5A6478';
  const Icon = iconMap[icon] || Workflow;
  const minutes = Math.round(avgRuntime / 60);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-2.5 p-2 rounded-lg bg-canvas-card/60 border border-canvas-border/50 cursor-grab active:cursor-grabbing hover:border-cortivex-cyan/20 hover:bg-canvas-card transition-all duration-200 group"
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${categoryColor}15` }}
      >
        <Icon size={14} color={categoryColor} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold text-text-muted truncate group-hover:text-text-primary transition-colors font-mono">
          {name}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[9px] font-mono text-warning-amber/80">
            ${avgCost.toFixed(2)}
          </span>
          <span className="text-[9px] font-mono text-text-dim">
            {minutes}m
          </span>
        </div>
      </div>
      <div
        className="w-1 h-5 rounded-full opacity-40 flex-shrink-0"
        style={{ backgroundColor: categoryColor }}
      />
    </div>
  );
}
