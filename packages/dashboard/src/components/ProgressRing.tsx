interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  className?: string;
}

export function ProgressRing({
  progress,
  size = 36,
  strokeWidth = 3,
  color = '#4F8EF7',
  bgColor = 'rgba(255,255,255,0.06)',
  className = '',
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      className={`progress-ring ${className}`}
    >
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={bgColor}
        strokeWidth={strokeWidth}
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="progress-ring-circle"
        strokeLinecap="round"
      />
      {/* Center text */}
      <text
        x="50%"
        y="50%"
        dy="0.35em"
        textAnchor="middle"
        fill={color}
        fontSize={size * 0.22}
        fontFamily="JetBrains Mono, monospace"
        fontWeight="600"
        style={{ transform: 'rotate(90deg)', transformOrigin: '50% 50%' }}
      >
        {Math.round(progress)}%
      </text>
    </svg>
  );
}
