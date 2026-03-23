import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-lg',
          'bg-surface-light border border-canvas-border',
          'px-3 py-2 text-xs font-mono text-text-primary',
          'placeholder:text-text-dim',
          'transition-colors duration-200',
          'focus:outline-none focus:border-cortivex-cyan/40 focus:ring-2 focus:ring-cortivex-cyan/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'file:border-0 file:bg-transparent file:text-xs file:font-mono file:font-medium file:text-text-primary',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
