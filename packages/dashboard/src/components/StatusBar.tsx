import { useCortivexStore } from '@/stores/cortivexStore';
import { Activity, CircleDot, DollarSign, Users } from 'lucide-react';
import clsx from 'clsx';

export function StatusBar() {
  const {
    activePipeline,
    activeRun,
    meshClaims,
    isConnected,
    history,
  } = useCortivexStore();

  const todayCost = history
    .filter((r) => {
      const d = new Date(r.timestamp);
      const today = new Date();
      return d.toDateString() === today.toDateString();
    })
    .reduce((sum, r) => sum + r.cost, 0) || 12.47; // fallback demo value

  const runStatus = activeRun
    ? activeRun.status === 'running'
      ? 'Running'
      : activeRun.status === 'completed'
        ? 'Completed'
        : 'Failed'
    : 'Idle';

  const statusColor = activeRun
    ? activeRun.status === 'running'
      ? 'text-cortivex-cyan'
      : activeRun.status === 'completed'
        ? 'text-success-green'
        : 'text-error-coral'
    : 'text-text-muted';

  return (
    <div className="h-[52px] bg-deep-space border-t border-canvas-border shadow-header flex items-center px-4 text-xs font-mono z-50 select-none">
      {/* Left: Pipeline name + status */}
      <div className="flex items-center gap-3 flex-1">
        <div className="flex items-center gap-1.5">
          <Activity size={12} className="text-text-muted" />
          <span className="text-text-muted">
            {activePipeline?.name || 'No pipeline'}
          </span>
        </div>
        <div className={clsx('flex items-center gap-1', statusColor)}>
          <CircleDot size={10} />
          <span>{runStatus}</span>
        </div>
      </div>

      {/* Center: Agent count + mesh */}
      <div className="flex items-center gap-4 flex-1 justify-center">
        <div className="flex items-center gap-1.5 text-text-muted">
          <Users size={12} />
          <span>
            {meshClaims.length} agent{meshClaims.length !== 1 ? 's' : ''} active
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-neural-purple">
            {meshClaims.filter((c) => c.status === 'conflict').length} conflicts
          </span>
        </div>
      </div>

      {/* Right: Cost + connection */}
      <div className="flex items-center gap-4 flex-1 justify-end">
        <div className="flex items-center gap-1.5 text-text-muted">
          <DollarSign size={12} />
          <span>Today: ${todayCost.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className={clsx(
              'w-[6px] h-[6px] rounded-full',
              isConnected
                ? 'bg-success-green shadow-glow-green'
                : 'bg-error-coral shadow-glow-red animate-pulse-alive',
            )}
          />
          <span className={isConnected ? 'text-success-green' : 'text-error-coral'}>
            {isConnected ? 'Connected' : 'Offline'}
          </span>
        </div>
      </div>
    </div>
  );
}
