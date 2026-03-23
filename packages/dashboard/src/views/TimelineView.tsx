import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Cpu,
  Layers,
} from 'lucide-react';
import { useCortivexStore } from '@/stores/cortivexStore';
import type { ExecutionRecord } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// ============================================
// CORTIVEX TIMELINE VIEW
// ============================================

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDate(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

const staggerChildren = {
  animate: { transition: { staggerChildren: 0.04 } },
};

const itemVariant = {
  initial: { opacity: 0, x: -12 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.25 } },
};

export function TimelineView() {
  const { history } = useCortivexStore();

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, ExecutionRecord[]> = {};
    // Process in reverse so newest is first
    const sorted = [...history].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    for (const record of sorted) {
      const dateKey = formatDate(record.timestamp);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(record);
    }
    return groups;
  }, [history]);

  // Summary stats
  const stats = useMemo(() => {
    const total = history.length;
    const completed = history.filter((r) => r.success).length;
    const failed = total - completed;
    const totalCost = history.reduce((s, r) => s + r.cost, 0);
    const avgDuration = history.length > 0
      ? history.reduce((s, r) => s + r.duration, 0) / history.length
      : 0;
    return { total, completed, failed, totalCost, avgDuration };
  }, [history]);

  return (
    <div className="flex flex-col h-full bg-canvas-dark">
      {/* Header with stats */}
      <div className="px-6 py-4 border-b border-canvas-border bg-surface shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-text-primary">
            Pipeline Timeline
          </h2>
          <Badge variant="secondary">{stats.total} total runs</Badge>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-transparent border-none shadow-none">
            <CardContent className="p-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-success-green/10 flex items-center justify-center">
                  <CheckCircle size={14} className="text-success-green" />
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                    Completed
                  </div>
                  <div className="text-base font-mono font-semibold text-text-primary">
                    {stats.completed}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-transparent border-none shadow-none">
            <CardContent className="p-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-error-coral/10 flex items-center justify-center">
                  <XCircle size={14} className="text-error-coral" />
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                    Failed
                  </div>
                  <div className="text-base font-mono font-semibold text-text-primary">
                    {stats.failed}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-transparent border-none shadow-none">
            <CardContent className="p-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cortivex-cyan/10 flex items-center justify-center">
                  <DollarSign size={14} className="text-cortivex-cyan" />
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                    Total Cost
                  </div>
                  <div className="text-base font-mono font-semibold text-text-primary">
                    ${stats.totalCost.toFixed(2)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-transparent border-none shadow-none">
            <CardContent className="p-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-warning-amber/10 flex items-center justify-center">
                  <Clock size={14} className="text-warning-amber" />
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                    Avg Duration
                  </div>
                  <div className="text-base font-mono font-semibold text-text-primary">
                    {formatDuration(stats.avgDuration)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          {Object.entries(grouped).map(([date, records]) => (
            <div key={date} className="mb-8">
              {/* Date separator */}
              <div className="flex items-center gap-3 mb-4">
                <Separator className="flex-1" />
                <Badge variant="secondary" className="shrink-0">
                  {date}
                </Badge>
                <Separator className="flex-1" />
              </div>

              {/* Records */}
              <motion.div
                className="space-y-3 relative"
                variants={staggerChildren}
                initial="initial"
                animate="animate"
              >
                {/* Vertical timeline line */}
                <div className="absolute left-[19px] top-2 bottom-2 w-px bg-canvas-border" />

                {records.map((record) => (
                  <motion.div
                    key={record.id}
                    variants={itemVariant}
                    className="flex items-start gap-4 group"
                  >
                    {/* Status dot */}
                    <div className="relative z-10 mt-4 shrink-0">
                      <div
                        className="w-[10px] h-[10px] rounded-full border-2"
                        style={{
                          borderColor: record.success ? '#3DD68C' : '#E05C5C',
                          backgroundColor: record.success ? '#3DD68C30' : '#E05C5C30',
                        }}
                      />
                    </div>

                    {/* Card */}
                    <div className="flex-1">
                      <Card className="hover:border-cortivex-cyan/20 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {record.success ? (
                                <CheckCircle size={14} className="text-success-green" />
                              ) : (
                                <XCircle size={14} className="text-error-coral" />
                              )}
                              <Badge
                                variant={record.success ? 'success' : 'destructive'}
                                className="text-[9px]"
                              >
                                {record.pipelineName}
                              </Badge>
                              <span className="text-[10px] font-mono text-text-dim">
                                #{record.runNumber}
                              </span>
                            </div>
                            <span className="text-xs font-mono text-text-muted">
                              {formatTime(record.timestamp)}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-xs font-mono text-text-muted">
                            <div className="flex items-center gap-1.5">
                              <Clock size={12} className="text-text-dim" />
                              <Badge variant="secondary" className="text-[9px] font-mono">
                                {formatDuration(record.duration)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <DollarSign size={12} className="text-text-dim" />
                              <Badge variant="secondary" className="text-[9px] font-mono">
                                ${record.cost.toFixed(2)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Cpu size={12} className="text-text-dim" />
                              <Badge variant="secondary" className="text-[9px] font-mono">
                                {(record.tokensUsed / 1000).toFixed(1)}K
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Layers size={12} className="text-text-dim" />
                              <span className="font-mono">{record.nodesRun} nodes</span>
                              {record.nodesFailed > 0 && (
                                <Badge variant="destructive" className="text-[9px]">
                                  {record.nodesFailed} failed
                                </Badge>
                              )}
                            </div>
                          </div>

                          {record.filesModified > 0 && (
                            <>
                              <Separator className="my-2" />
                              <div className="text-[10px] font-mono text-text-dim">
                                {record.filesModified} files modified
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
