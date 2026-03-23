/**
 * Cortivex Design Tokens
 *
 * Professional dark theme inspired by SWARM's void palette
 * with stitch-skills design system patterns.
 */

export const tokens = {
  colors: {
    // Core surfaces
    void: '#050508',       // Deepest black — sidebar, header
    background: '#0B0D14', // Main content background
    surface: '#12151E',    // Cards, elevated elements
    border: '#1A1F2E',     // Subtle borders, dividers

    // Text hierarchy
    textPrimary: '#CDD5E0',
    textMuted: '#5A6478',
    textDim: '#353D4F',

    // Accent colors
    blue: '#4F8EF7',       // Primary accent, info, interactive
    purple: '#7B6EF6',     // Secondary, knowledge, patterns
    green: '#3DD68C',      // Success, healthy, completed
    amber: '#E8A44A',      // Warning, leader, orchestration
    red: '#E05C5C',        // Error, danger, dead agents
    teal: '#22D3EE',       // Tertiary, pipeline generation

    // Category colors
    quality: '#4F8EF7',
    security: '#E05C5C',
    testing: '#3DD68C',
    devops: '#E8A44A',
    docs: '#a78bfa',
    refactoring: '#22d3ee',
    analysis: '#7B6EF6',
    orchestration: '#E8A44A',
  },

  typography: {
    fontSans: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
    fontMono: '"Space Mono", "JetBrains Mono", monospace',
    fontDisplay: '"Space Mono", monospace',
  },

  spacing: {
    sidebarWidth: '56px',
    headerHeight: '52px',
    statusBarHeight: '52px',
    nodeWidth: 240,
    nodeHeight: 110,
    portRadius: 6,
  },

  shadows: {
    panel: '0 1px 3px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.2)',
    panelHover: '0 1px 3px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.2), 0 0 0 1px rgba(79,142,247,0.15)',
    glowBlue: '0 0 12px rgba(79,142,247,0.3)',
    glowGreen: '0 0 12px rgba(61,214,140,0.3)',
    glowAmber: '0 0 12px rgba(232,164,74,0.3)',
    glowRed: '0 0 12px rgba(224,92,92,0.3)',
  },

  animation: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;
