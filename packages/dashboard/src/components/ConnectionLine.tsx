import { useMemo } from 'react';
import { CATEGORY_COLORS } from '@/lib/types';
import { NODE_WIDTH, NODE_HEIGHT } from '@/components/NodeCard';
import type { PipelineNode, NodeCategory } from '@/lib/types';

interface ConnectionLineProps {
  sourceNode: PipelineNode;
  targetNode: PipelineNode;
  executing?: boolean;
  completed?: boolean;
  label?: string;
}

export function ConnectionLine({
  sourceNode,
  targetNode,
  executing = false,
  completed = false,
  label,
}: ConnectionLineProps) {
  const { path, midX, midY } = useMemo(() => {
    // Output port = right center of source node
    const sx = sourceNode.position.x + NODE_WIDTH;
    const sy = sourceNode.position.y + NODE_HEIGHT / 2;
    // Input port = left edge of target node
    const tx = targetNode.position.x;
    const ty = targetNode.position.y + NODE_HEIGHT / 2;

    // n8n-style smooth bezier with adaptive control offset
    const dx = Math.abs(tx - sx);
    const controlOffset = Math.max(dx * 0.5, 60);

    const pathD = `M ${sx} ${sy} C ${sx + controlOffset} ${sy}, ${tx - controlOffset} ${ty}, ${tx} ${ty}`;

    return {
      path: pathD,
      midX: (sx + tx) / 2,
      midY: (sy + ty) / 2,
    };
  }, [sourceNode.position, targetNode.position]);

  // n8n style: dashed lines, subtle colors
  const strokeColor = executing
    ? 'rgba(79, 142, 247, 0.5)'
    : completed
      ? 'rgba(61, 214, 140, 0.4)'
      : 'rgba(255, 255, 255, 0.15)';

  const strokeWidth = executing ? 2 : 1.5;

  return (
    <g>
      {/* Main dashed line */}
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray="5,5"
        className={executing ? 'n8n-connection-executing' : ''}
        strokeLinecap="round"
      />

      {/* Subtle glow for executing connections */}
      {executing && (
        <path
          d={path}
          fill="none"
          stroke="rgba(79, 142, 247, 0.1)"
          strokeWidth={6}
          strokeLinecap="round"
        />
      )}

      {/* Optional label at midpoint */}
      {label && (
        <g>
          <rect
            x={midX - 24}
            y={midY - 8}
            width={48}
            height={16}
            rx={4}
            fill="rgba(18, 21, 30, 0.9)"
            stroke="rgba(26, 31, 46, 0.6)"
            strokeWidth={0.5}
          />
          <text
            x={midX}
            y={midY + 4}
            textAnchor="middle"
            fill="rgba(255, 255, 255, 0.45)"
            fontSize="9"
            fontFamily="'Space Mono', monospace"
          >
            {label}
          </text>
        </g>
      )}
    </g>
  );
}

// Flowing particles along a connection path
export function ConnectionParticles({
  sourceNode,
  targetNode,
  color,
}: {
  sourceNode: PipelineNode;
  targetNode: PipelineNode;
  color?: string;
}) {
  const particleColor = color || CATEGORY_COLORS[sourceNode.category as NodeCategory] || '#4F8EF7';

  const sx = sourceNode.position.x + NODE_WIDTH;
  const sy = sourceNode.position.y + NODE_HEIGHT / 2;
  const tx = targetNode.position.x;
  const ty = targetNode.position.y + NODE_HEIGHT / 2;

  const dx = Math.abs(tx - sx);
  const controlOffset = Math.max(dx * 0.5, 60);
  const pathD = `M ${sx} ${sy} C ${sx + controlOffset} ${sy}, ${tx - controlOffset} ${ty}, ${tx} ${ty}`;
  const pathId = `particle-path-${sourceNode.id}-${targetNode.id}`;

  return (
    <g>
      <defs>
        <path id={pathId} d={pathD} />
      </defs>

      {[0, 50].map((delay) => (
        <circle key={delay} r="2" fill={particleColor} opacity="0.5">
          <animateMotion
            dur="2s"
            repeatCount="indefinite"
            begin={`${delay / 100}s`}
          >
            <mpath href={`#${pathId}`} />
          </animateMotion>
        </circle>
      ))}

      {[0, 50].map((delay) => (
        <circle key={`core-${delay}`} r="1" fill="white" opacity="0.7">
          <animateMotion
            dur="2s"
            repeatCount="indefinite"
            begin={`${delay / 100}s`}
          >
            <mpath href={`#${pathId}`} />
          </animateMotion>
        </circle>
      ))}
    </g>
  );
}
