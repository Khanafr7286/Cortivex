import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'rounded-lg text-sm font-mono font-medium',
    'transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cortivex-cyan/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'bg-cortivex-cyan/20 text-cortivex-cyan border border-cortivex-cyan/30 hover:bg-cortivex-cyan/30 hover:border-cortivex-cyan/50 active:bg-cortivex-cyan/40',
        destructive:
          'bg-error-coral text-white shadow-glow-red hover:bg-error-coral/90 active:bg-error-coral/80',
        outline:
          'border border-canvas-border bg-transparent text-text-primary hover:bg-surface-light hover:border-cortivex-cyan/30 active:bg-surface-light/80',
        secondary:
          'bg-surface-light text-text-primary border border-canvas-border hover:bg-surface-lighter hover:border-canvas-border active:bg-surface-light',
        ghost:
          'text-text-muted hover:bg-surface-light hover:text-text-primary active:bg-surface-light/80',
        link:
          'text-cortivex-cyan underline-offset-4 hover:underline active:text-cortivex-cyan/80',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-lg px-8 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
