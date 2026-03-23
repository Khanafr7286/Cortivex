/**
 * Cortivex Brand Constants
 *
 * Design Language: "Neural Mesh"
 * Inspired by neural networks, circuit boards, and data flow visualization.
 *
 * Name origin: Cortex (brain's orchestration layer) + Vertex (graph theory node)
 */

export const COLORS = {
  deepSpace: '#0a0a0f',
  electricCyan: '#00e5ff',
  neuralPurple: '#7c3aed',
  plasmaTeal: '#22d3ee',
  brightWhite: '#f0f0f5',
  warmGray: '#6b7280',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
} as const;

export type BrandColor = (typeof COLORS)[keyof typeof COLORS];

export const CATEGORY_COLORS: Record<string, string> = {
  quality: '#3b82f6', // blue
  security: '#ef4444', // red
  testing: '#22c55e', // green
  devops: '#f59e0b', // amber
  docs: '#8b5cf6', // violet
  refactoring: '#06b6d4', // cyan
  analysis: '#ec4899', // pink
};

export const FONTS = {
  ui: "'Inter', -apple-system, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
} as const;

/** Semantic color tokens for UI components */
export const SEMANTIC = {
  background: {
    primary: COLORS.deepSpace,
    elevated: '#111118',
    surface: '#1a1a24',
    overlay: 'rgba(10, 10, 15, 0.8)',
  },
  text: {
    primary: COLORS.brightWhite,
    secondary: COLORS.warmGray,
    accent: COLORS.electricCyan,
    link: COLORS.plasmaTeal,
  },
  border: {
    default: '#1f2937',
    active: COLORS.electricCyan,
    focus: COLORS.neuralPurple,
  },
  node: {
    active: COLORS.electricCyan,
    learning: COLORS.neuralPurple,
    idle: COLORS.warmGray,
    success: COLORS.success,
    error: COLORS.error,
    warning: COLORS.warning,
  },
  connection: {
    active: COLORS.electricCyan,
    inactive: '#374151',
    data: COLORS.plasmaTeal,
  },
} as const;

/** Animation timing constants for the Neural Mesh design language */
export const ANIMATION = {
  fast: '150ms',
  normal: '250ms',
  slow: '400ms',
  pulse: '2000ms',
  dataFlow: '3000ms',
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  },
} as const;

/** Z-index layers */
export const LAYERS = {
  mesh: 0,
  connections: 10,
  nodes: 20,
  panels: 30,
  modals: 40,
  tooltips: 50,
  notifications: 60,
} as const;

/** Breakpoints for responsive layout */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
} as const;

/** Logo asset paths (relative to assets/) */
export const LOGO = {
  full: './logo.svg',
  small: './logo-small.svg',
  wordmark: './logo-wordmark.svg',
  dark: './logo-dark.svg',
  banner: './logo-banner.svg',
} as const;

/** Node type icon paths (relative to assets/icons/) */
export const NODE_ICONS: Record<string, string> = {
  'code-reviewer': './icons/code-reviewer.svg',
  'security-scanner': './icons/security-scanner.svg',
  'auto-fixer': './icons/auto-fixer.svg',
  'test-generator': './icons/test-generator.svg',
  'test-runner': './icons/test-runner.svg',
  'pr-creator': './icons/pr-creator.svg',
  'doc-writer': './icons/doc-writer.svg',
  'type-migrator': './icons/type-migrator.svg',
  'refactor-agent': './icons/refactor-agent.svg',
  'dependency-updater': './icons/dependency-updater.svg',
  'architect-analyzer': './icons/architect-analyzer.svg',
  'performance-profiler': './icons/performance-profiler.svg',
  'api-designer': './icons/api-designer.svg',
  'database-migrator': './icons/database-migrator.svg',
  'ci-generator': './icons/ci-generator.svg',
  'bug-hunter': './icons/bug-hunter.svg',
  'code-explainer': './icons/code-explainer.svg',
  'lint-fixer': './icons/lint-fixer.svg',
  'e2e-test-writer': './icons/e2e-test-writer.svg',
  'changelog-writer': './icons/changelog-writer.svg',
};

/** Category icon paths (relative to assets/icons/) */
export const CATEGORY_ICONS: Record<string, string> = {
  quality: './icons/category-quality.svg',
  security: './icons/category-security.svg',
  testing: './icons/category-testing.svg',
  devops: './icons/category-devops.svg',
  docs: './icons/category-docs.svg',
  refactoring: './icons/category-refactoring.svg',
  analysis: './icons/category-analysis.svg',
};
