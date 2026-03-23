import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  [
    'inline-flex items-center rounded-full px-2.5 py-0.5',
    'text-[10px] font-mono font-semibold uppercase tracking-wider',
    'transition-colors duration-200',
    'border',
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'border-cortivex-cyan/30 bg-cortivex-cyan/10 text-cortivex-cyan',
        secondary:
          'border-canvas-border bg-surface-light text-text-muted',
        destructive:
          'border-error-coral/30 bg-error-coral/10 text-error-coral',
        outline:
          'border-canvas-border bg-transparent text-text-primary',
        success:
          'border-success-green/30 bg-success-green/10 text-success-green',
        warning:
          'border-warning-amber/30 bg-warning-amber/10 text-warning-amber',
        purple:
          'border-neural-purple/30 bg-neural-purple/10 text-neural-purple',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  ),
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
