import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  DollarSign,
  Cpu,
  FileCode,
  CheckCircle,
  XCircle,
  Timer,
  Zap,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useCortivexStore } from '@/stores/cortivexStore';
import { NodeCard } from '@/components/NodeCard';
import { ConnectionLine, ConnectionParticles } from '@/components/ConnectionLine';
import { TerminalOutput } from '@/components/TerminalOutput';
import { ProgressRing } from '@/components/ProgressRing';
import { CATEGORY_COLORS } from '@/lib/types';
import type { PipelineNode } from '@/lib/types';
import clsx from 'clsx';

export function LiveExecutionView() {
  const {
    activeRun,
    terminalOutput,
    activeTerminalTab,
    setActiveTerminalTab,
    editorNodes,
    editorConnections,
    runPipeline,
    editorPipelineName,
  } = useCortivexStore();

  const [elapsed, setElapsed] = useState(0);
  const [terminalMinimized, setTerminalMinimized] = useState(false);

  // Live elapsed timer
  useEffect(() => {
    if (!activeRun || activeRun.status !== 'running') return;

    const startTime = new Date(activeRun.startedAt).getTime();
    const interval = setInterval(() => {
      setElapsed((Date.now() - startTime) / 1000);
    }, 100);

    return () => clearInterval(interval);
  }, [activeRun]);

  // Use active run nodes, or fallback to editor nodes for preview
  const displayNodes = activeRun?.nodes || editorNodes;
  const displayConnections = activeRun?.connections || editorConnections;
  const nodeMap = new Map(displayNodes.map((n) => [n.id, n]));

  // No scaling — nodes render at full size, container scrolls

  const completedNodes = displayNodes.filter((n) => n.status === 'completed');
  const runningNodes = displayNodes.filter((n) => n.status === 'running');
  const failedNodes = displayNodes.filter((n) => n.status === 'failed');

  // Current terminal output
  const currentTerminal = terminalOutput.find(
    (t) => t.nodeId === activeTerminalTab,
  );

  // Files modified — read from actual node run state
  const filesModified = completedNodes.flatMap((n) => n.filesModified || []);

  return (
    <div className="flex flex-col h-full">
      {/* Top Area — Pipeline Visualization (expands when terminal minimized) */}
      <div className={clsx('relative overflow-auto border-b border-canvas-border/40 bg-canvas-dark transition-all duration-300', terminalMinimized ? 'flex-1' : 'flex-[6]')}>
        {/* n8n-style dot grid */}
        <div className="absolute inset-0 pointer-events-none dot-grid" />
        {!activeRun ? (
          <EmptyExecutionState
            onRun={() => runPipeline(editorPipelineName)}
          />
        ) : (
          <div className="relative" style={{ minWidth: '1100px', minHeight: '560px' }}>
            {/* SVG Connections — full size */}
            <svg className="absolute top-0 left-0 pointer-events-none" style={{ width: '1100px', height: '560px', overflow: 'visible' }}>
              {displayConnections.map((conn) => {
                const source = nodeMap.get(conn.sourceId);
                const target = nodeMap.get(conn.targetId);
                if (!source || !target) return null;
                const isExecuting = source.status === 'completed' && target.status === 'running';
                const isCompleted = source.status === 'completed' && target.status === 'completed';
                return (
                  <g key={conn.id}>
                    <ConnectionLine sourceNode={source} targetNode={target} executing={isExecuting} completed={isCompleted} />
                    {isExecuting && <ConnectionParticles sourceNode={source} targetNode={target} />}
                  </g>
                );
              })}
            </svg>

            {/* Nodes at FULL SIZE */}
            {displayNodes.map((node) => (
              <div key={node.id} className="absolute" style={{ left: node.position.x, top: node.position.y }}>
                <NodeCard node={node} selected={activeTerminalTab === node.id} onSelect={(id) => setActiveTerminalTab(id)} showPorts={true} />
                {node.status === 'running' && (
                  <div className="absolute -top-2 -right-2">
                    <ProgressRing progress={node.progress} size={28} strokeWidth={2.5} color={CATEGORY_COLORS[node.category]} />
                  </div>
                )}
              </div>
            ))}

            {/* Run status banner — pinned top center */}
            <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50">
              <motion.div
                className={clsx(
                  'bg-canvas-card border border-canvas-border rounded-full px-4 py-1.5 flex items-center gap-2 shadow-lg',
                  activeRun.status === 'running' && 'border-cortivex-cyan/30',
                  activeRun.status === 'completed' && 'border-success-green/30',
                  activeRun.status === 'failed' && 'border-error-coral/30',
                )}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
              >
                {activeRun.status === 'running' && (
                  <>
                    <div className="w-2 h-2 rounded-full bg-cortivex-cyan animate-pulse" />
                    <span className="text-xs text-cortivex-cyan font-medium">Pipeline Running</span>
                  </>
                )}
                {activeRun.status === 'completed' && (
                  <>
                    <CheckCircle size={14} className="text-success-green" />
                    <span className="text-xs text-success-green font-medium">Pipeline Completed</span>
                  </>
                )}
                {activeRun.status === 'failed' && (
                  <>
                    <XCircle size={14} className="text-error-coral" />
                    <span className="text-xs text-error-coral font-medium">Pipeline Failed</span>
                  </>
                )}
              </motion.div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Area — Terminal + Stats (collapsible) */}
      <div className={clsx('flex transition-all duration-300', terminalMinimized ? 'h-10' : 'flex-[4]')}>
        {/* Terminal (left) */}
        <div className="flex-1 flex flex-col border-r border-canvas-border/40">
          {/* Tab bar with minimize toggle */}
          <div className="flex items-center border-b border-canvas-border/40 overflow-x-auto bg-canvas-dark/80">
            <button
              onClick={() => setTerminalMinimized(!terminalMinimized)}
              className="px-2 py-2 text-text-muted hover:text-cortivex-cyan transition-colors flex-shrink-0"
              title={terminalMinimized ? 'Expand terminal' : 'Minimize terminal'}
            >
              {terminalMinimized ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
            </button>
            {displayNodes.map((node) => (
              <button
                key={node.id}
                onClick={() => setActiveTerminalTab(node.id)}
                className={clsx(
                  'px-3 py-2 text-[11px] font-mono border-b-2 transition-all whitespace-nowrap',
                  activeTerminalTab === node.id
                    ? 'border-cortivex-cyan text-cortivex-cyan bg-cortivex-cyan/5'
                    : 'border-transparent text-text-muted hover:text-text-primary hover:bg-white/5',
                )}
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
                  style={{
                    backgroundColor:
                      node.status === 'completed'
                        ? '#3DD68C'
                        : node.status === 'running'
                          ? '#4F8EF7'
                          : node.status === 'failed'
                            ? '#E05C5C'
                            : '#4b5563',
                  }}
                />
                {node.name}
              </button>
            ))}
          </div>

          {/* Terminal content — hidden when minimized */}
          {!terminalMinimized && (
            <div className="flex-1 overflow-hidden">
              <TerminalOutput
                lines={currentTerminal?.lines || []}
                title={activeTerminalTab || 'No node selected'}
                maxHeight="100%"
                className="h-full rounded-none border-0"
              />
            </div>
          )}
        </div>

        {/* Stats sidebar (right) — hidden when minimized */}
        <div className={clsx('w-72 p-4 overflow-y-auto bg-canvas-dark/60', terminalMinimized && 'hidden')}>
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
            Execution Stats
          </h3>

          {/* Top-level stats */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <StatCard
              icon={Timer}
              label="Elapsed"
              value={formatDuration(
                activeRun?.status === 'completed'
                  ? activeRun.totalDuration
                  : elapsed,
              )}
              color="#4F8EF7"
            />
            <StatCard
              icon={DollarSign}
              label="Total Cost"
              value={`$${(activeRun?.totalCost || 0).toFixed(3)}`}
              color="#E8A44A"
            />
            <StatCard
              icon={Cpu}
              label="Tokens"
              value={formatTokens(activeRun?.totalTokens || 0)}
              color="#7B6EF6"
            />
            <StatCard
              icon={FileCode}
              label="Files"
              value={String(filesModified.length)}
              color="#22d3ee"
            />
          </div>

          {/* Per-node breakdown */}
          <h4 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">
            Node Breakdown
          </h4>
          <div className="space-y-1.5">
            <AnimatePresence>
              {displayNodes.map((node) => (
                <NodeStatCard key={node.id} node={node} />
              ))}
            </AnimatePresence>
          </div>

          {/* Files modified */}
          {filesModified.length > 0 && (
            <>
              <h4 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mt-4 mb-2">
                Files Modified
              </h4>
              <div className="space-y-0.5">
                {filesModified.map((file, i) => (
                  <div
                    key={i}
                    className="text-[10px] font-mono text-text-muted truncate"
                  >
                    {file}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function EmptyExecutionState({ onRun }: { onRun: () => void }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <motion.div
        className="bg-canvas-card border border-canvas-border rounded-2xl p-8 text-center max-w-md shadow-xl"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div className="w-16 h-16 rounded-2xl bg-cortivex-cyan/10 flex items-center justify-center mx-auto mb-4">
          <Zap size={28} className="text-cortivex-cyan" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          No Active Execution
        </h3>
        <p className="text-sm text-text-muted mb-6">
          Start a pipeline run from the editor or click below to execute the
          current pipeline.
        </p>
        <motion.button
          onClick={onRun}
          className="btn-primary flex items-center gap-2 mx-auto glow-cyan"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Zap size={16} />
          Run Pipeline
        </motion.button>
      </motion.div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="glass-subtle rounded-lg p-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={11} color={color} />
        <span className="text-[9px] text-text-muted uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="text-sm font-semibold font-mono" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function NodeStatCard({ node }: { node: PipelineNode }) {
  const statusIcon = {
    idle: null,
    pending: null,
    running: (
      <div className="w-2 h-2 rounded-full bg-cortivex-cyan animate-pulse" />
    ),
    completed: <CheckCircle size={12} className="text-success-green" />,
    failed: <XCircle size={12} className="text-error-coral" />,
    skipped: <div className="w-2 h-2 rounded-full bg-[#353D4F]" />,
  }[node.status];

  return (
    <motion.div
      className="glass-subtle rounded-md px-2.5 py-1.5 flex items-center gap-2"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      layout
    >
      {statusIcon}
      <span className="text-[11px] text-text-primary flex-1 truncate">
        {node.name}
      </span>
      {node.status === 'completed' && (
        <div className="flex items-center gap-2 text-[9px] font-mono">
          <span className="text-text-muted">
            {formatDuration(node.duration)}
          </span>
          <span className="text-warning-amber/70">
            ${node.cost.toFixed(3)}
          </span>
        </div>
      )}
      {node.status === 'running' && node.progress > 0 && (
        <span className="text-[9px] font-mono text-cortivex-cyan">
          {Math.round(node.progress)}%
        </span>
      )}
    </motion.div>
  );
}

// ============================================
// HELPERS
// ============================================

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs.toFixed(0)}s`;
}

function formatTokens(tokens: number): string {
  if (tokens < 1000) return String(tokens);
  if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}k`;
  return `${(tokens / 1000000).toFixed(2)}M`;
}
