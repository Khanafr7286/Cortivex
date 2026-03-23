/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Core surfaces (SWARM-style professional dark palette)
        'deep-space': '#050508',
        'surface': '#0B0D14',
        'surface-light': '#12151E',
        'surface-lighter': '#1A1F2E',
        'canvas-dark': '#0B0D14',
        'canvas-card': '#12151E',
        'canvas-border': '#1A1F2E',
        'border-dim': 'rgba(26, 31, 46, 0.8)',
        'border-glow': 'rgba(79, 142, 247, 0.15)',

        // Accent colors
        'cortivex-cyan': '#4F8EF7',
        'neural-purple': '#7B6EF6',
        'plasma-teal': '#22d3ee',
        'success-green': '#3DD68C',
        'error-coral': '#E05C5C',
        'warning-amber': '#E8A44A',

        // Text hierarchy
        'text-primary': '#CDD5E0',
        'text-muted': '#5A6478',
        'text-dim': '#353D4F',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"Space Mono"', '"JetBrains Mono"', 'monospace'],
        display: ['"Space Mono"', 'monospace'],
      },
      fontSize: {
        'data-xl': ['2.5rem', { lineHeight: '1.1', fontWeight: '500' }],
        'data-lg': ['1.75rem', { lineHeight: '1.2', fontWeight: '500' }],
        'label': ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.12em', fontWeight: '500' }],
      },
      borderRadius: {
        'panel': '16px',
      },
      boxShadow: {
        'panel': '0 1px 3px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.2)',
        'panel-hover': '0 1px 3px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.2), 0 0 0 1px rgba(79,142,247,0.15)',
        'glow-blue': '0 0 12px rgba(79,142,247,0.3)',
        'glow-gold': '0 0 12px rgba(232,164,74,0.3)',
        'glow-green': '0 0 12px rgba(61,214,140,0.3)',
        'glow-red': '0 0 12px rgba(224,92,92,0.3)',
        'glow-purple': '0 0 12px rgba(123,110,246,0.3)',
        'header': '0 1px 0 rgba(0,0,0,0.5)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'pulse-alive': 'pulseAlive 2s ease-in-out infinite',
        'flow': 'flow 1.5s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'gradient-shift': 'gradientShift 15s ease infinite',
        'particle-flow': 'particleFlow 2s linear infinite',
        'shake': 'shake 0.5s ease-in-out',
        'icon-pulse': 'iconPulse 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-out both',
        'slide-up': 'slideUp 0.4s ease-out both',
        'border-glow': 'borderGlow 2s ease-in-out infinite',
        'breathe': 'breathe 3s ease-in-out infinite',
        'breathe-slow': 'breathe 4s ease-in-out infinite',
        'view-enter': 'viewEnter 200ms ease-out both',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(79, 142, 247, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(79, 142, 247, 0.6), 0 0 80px rgba(79, 142, 247, 0.2)' },
        },
        pulseAlive: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        flow: {
          '0%': { strokeDashoffset: '24' },
          '100%': { strokeDashoffset: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        gradientShift: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        particleFlow: {
          '0%': { offsetDistance: '0%' },
          '100%': { offsetDistance: '100%' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
        iconPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.1)', opacity: '0.85' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        borderGlow: {
          '0%, 100%': { borderColor: 'rgba(79, 142, 247, 0.2)' },
          '50%': { borderColor: 'rgba(79, 142, 247, 0.6)' },
        },
        breathe: {
          '0%, 100%': { opacity: '0.15', transform: 'scale(0.95)' },
          '50%': { opacity: '0.25', transform: 'scale(1.05)' },
        },
        viewEnter: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'mesh-gradient': 'linear-gradient(135deg, rgba(123, 110, 246, 0.05) 0%, rgba(79, 142, 247, 0.05) 50%, rgba(34, 211, 238, 0.03) 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
