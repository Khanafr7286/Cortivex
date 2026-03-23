import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import {
  DollarSign,
  CheckCircle,
  Clock,
  Cpu,
} from 'lucide-react';
import { useCortivexStore } from '@/stores/cortivexStore';

// ============================================
// CORTIVEX METRICS VIEW
// ============================================

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function StatCard({
  label,
  value,
  icon,
  color,
  subtext,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  subtext?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-canvas-card border border-canvas-border rounded-lg p-5"
    >
      <div className="flex items-center gap-3 mb-3">
        <div style={{ color }}>{icon}</div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">{label}</span>
      </div>
      <div className="font-mono text-[32px] font-medium leading-none text-gray-200">
        {value}
      </div>
      {subtext && (
        <div className="mt-2 text-xs font-mono text-gray-500">{subtext}</div>
      )}
      <div className="mt-3 h-[2px] rounded-full" style={{ backgroundColor: color, opacity: 0.4 }} />
    </motion.div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-canvas-card border border-canvas-border rounded-lg px-3 py-2 text-xs font-mono shadow-xl">
      <div className="text-gray-500 mb-1">{label}</div>
      {payload.map((p: { color: string; name: string; value: number }, i: number) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? formatNumber(p.value) : p.value}
        </div>
      ))}
    </div>
  );
}

export function MetricsView() {
  const { history } = useCortivexStore();

  // Summary stats
  const stats = useMemo(() => {
    const totalRuns = history.length;
    const totalCost = history.reduce((s, r) => s + r.cost, 0);
    const totalTokens = history.reduce((s, r) => s + r.tokensUsed, 0);
    const successCount = history.filter((r) => r.success).length;
    const successRate = totalRuns > 0 ? (successCount / totalRuns) * 100 : 0;
    const avgDuration = totalRuns > 0
      ? history.reduce((s, r) => s + r.duration, 0) / totalRuns
      : 0;
    return { totalRuns, totalCost, totalTokens, successRate, avgDuration };
  }, [history]);

  // Cost over time data
  const costOverTime = useMemo(() => {
    const sorted = [...history].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    // Group by date
    const byDate: Record<string, { cost: number; runs: number; tokens: number }> = {};
    for (const record of sorted) {
      const dateKey = new Date(record.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      if (!byDate[dateKey]) byDate[dateKey] = { cost: 0, runs: 0, tokens: 0 };
      byDate[dateKey].cost += record.cost;
      byDate[dateKey].runs += 1;
      byDate[dateKey].tokens += record.tokensUsed;
    }
    return Object.entries(byDate).map(([date, data]) => ({
      date,
      cost: Number(data.cost.toFixed(2)),
      runs: data.runs,
      tokens: data.tokens,
    }));
  }, [history]);

  // Tokens per pipeline
  const tokensPerPipeline = useMemo(() => {
    const byPipeline: Record<string, { tokens: number; runs: number; cost: number }> = {};
    for (const record of history) {
      if (!byPipeline[record.pipelineName]) {
        byPipeline[record.pipelineName] = { tokens: 0, runs: 0, cost: 0 };
      }
      byPipeline[record.pipelineName].tokens += record.tokensUsed;
      byPipeline[record.pipelineName].runs += 1;
      byPipeline[record.pipelineName].cost += record.cost;
    }
    return Object.entries(byPipeline)
      .map(([name, data]) => ({
        name,
        tokens: data.tokens,
        runs: data.runs,
        avgCost: Number((data.cost / data.runs).toFixed(2)),
      }))
      .sort((a, b) => b.tokens - a.tokens);
  }, [history]);

  // Success rate over time (rolling window)
  const successRateOverTime = useMemo(() => {
    const sorted = [...history].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    const windowSize = 5;
    const data: { run: string; rate: number }[] = [];
    for (let i = windowSize - 1; i < sorted.length; i++) {
      const window = sorted.slice(i - windowSize + 1, i + 1);
      const successes = window.filter((r) => r.success).length;
      data.push({
        run: `#${sorted[i].runNumber}`,
        rate: Number(((successes / windowSize) * 100).toFixed(0)),
      });
    }
    return data;
  }, [history]);

  return (
    <div className="h-full overflow-y-auto bg-canvas-dark p-6">
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Runs"
          value={String(stats.totalRuns)}
          icon={<CheckCircle size={18} />}
          color="#00e5ff"
          subtext={`${stats.successRate.toFixed(0)}% success rate`}
        />
        <StatCard
          label="Total Cost"
          value={`$${stats.totalCost.toFixed(2)}`}
          icon={<DollarSign size={18} />}
          color="#10b981"
          subtext={`$${(stats.totalCost / Math.max(stats.totalRuns, 1)).toFixed(2)} avg per run`}
        />
        <StatCard
          label="Total Tokens"
          value={formatNumber(stats.totalTokens)}
          icon={<Cpu size={18} />}
          color="#7c3aed"
          subtext={`${formatNumber(stats.totalTokens / Math.max(stats.totalRuns, 1))} avg per run`}
        />
        <StatCard
          label="Avg Duration"
          value={formatDuration(stats.avgDuration)}
          icon={<Clock size={18} />}
          color="#f59e0b"
          subtext={`${stats.totalRuns} runs measured`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        {/* Cost Over Time */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-canvas-card border border-canvas-border rounded-lg p-5"
        >
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Cost Over Time</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={costOverTime}>
              <defs>
                <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#3d3d4f" strokeOpacity={0.3} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: '#6b7280', fontFamily: 'JetBrains Mono' }}
                stroke="transparent"
              />
              <YAxis
                tick={{ fontSize: 9, fill: '#6b7280', fontFamily: 'JetBrains Mono' }}
                stroke="transparent"
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip content={<DarkTooltip />} />
              <Area
                type="monotone"
                dataKey="cost"
                name="Cost"
                stroke="#00e5ff"
                fill="url(#costGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Runs Per Day */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-canvas-card border border-canvas-border rounded-lg p-5"
        >
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Runs Per Day</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={costOverTime}>
              <CartesianGrid stroke="#3d3d4f" strokeOpacity={0.3} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: '#6b7280', fontFamily: 'JetBrains Mono' }}
                stroke="transparent"
              />
              <YAxis
                tick={{ fontSize: 9, fill: '#6b7280', fontFamily: 'JetBrains Mono' }}
                stroke="transparent"
                allowDecimals={false}
              />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="runs" name="Runs" fill="#7c3aed" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Tokens Per Pipeline */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-canvas-card border border-canvas-border rounded-lg p-5"
        >
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Tokens Per Pipeline</h3>
          <div className="space-y-3 mt-2">
            {tokensPerPipeline.map((item) => {
              const maxTokens = tokensPerPipeline[0]?.tokens || 1;
              const pct = (item.tokens / maxTokens) * 100;
              return (
                <div key={item.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-gray-300">{item.name}</span>
                    <span className="text-xs font-mono text-gray-500">
                      {formatNumber(item.tokens)} tokens
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-canvas-dark overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: 0.3 }}
                      className="h-full rounded-full"
                      style={{
                        background: 'linear-gradient(90deg, #7c3aed, #00e5ff)',
                        boxShadow: '0 0 8px rgba(0, 229, 255, 0.3)',
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] font-mono text-gray-600">
                      {item.runs} runs
                    </span>
                    <span className="text-[10px] font-mono text-gray-600">
                      ${item.avgCost}/run avg
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Success Rate Over Time */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-canvas-card border border-canvas-border rounded-lg p-5"
        >
          <h3 className="text-sm font-semibold text-gray-200 mb-4">
            Success Rate (rolling {5}-run window)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={successRateOverTime}>
              <defs>
                <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#3d3d4f" strokeOpacity={0.3} vertical={false} />
              <XAxis
                dataKey="run"
                tick={{ fontSize: 9, fill: '#6b7280', fontFamily: 'JetBrains Mono' }}
                stroke="transparent"
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 9, fill: '#6b7280', fontFamily: 'JetBrains Mono' }}
                stroke="transparent"
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<DarkTooltip />} />
              <Line
                type="monotone"
                dataKey="rate"
                name="Success Rate"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#10b981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
}
