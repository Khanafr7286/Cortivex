import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*  Toast variant styles                                                       */
/* -------------------------------------------------------------------------- */

const toastVariants = cva(
  [
    'pointer-events-auto relative flex items-start gap-3 w-full max-w-sm overflow-hidden',
    'rounded-lg border p-4 shadow-panel',
    'transition-all duration-300 ease-out',
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'bg-surface border-canvas-border text-text-primary',
        success:
          'bg-surface border-success-green/30 text-text-primary',
        error:
          'bg-surface border-error-coral/30 text-text-primary',
        warning:
          'bg-surface border-warning-amber/30 text-text-primary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const accentColors: Record<string, string> = {
  default: 'bg-cortivex-cyan',
  success: 'bg-success-green',
  error: 'bg-error-coral',
  warning: 'bg-warning-amber',
};

/* -------------------------------------------------------------------------- */
/*  Toast component                                                            */
/* -------------------------------------------------------------------------- */

export interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  title?: string;
  description?: string;
  onClose?: () => void;
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant = 'default', title, description, onClose, children, ...props }, ref) => {
    const variantKey = variant ?? 'default';

    return (
      <div
        ref={ref}
        className={cn(toastVariants({ variant }), className)}
        role="alert"
        {...props}
      >
        {/* Left accent stripe */}
        <div
          className={cn(
            'absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg',
            accentColors[variantKey],
          )}
        />

        {/* Content */}
        <div className="flex-1 pl-1">
          {title && (
            <div className="text-xs font-mono font-semibold uppercase tracking-wider text-text-primary">
              {title}
            </div>
          )}
          {description && (
            <div className="mt-1 text-xs text-text-muted leading-relaxed">
              {description}
            </div>
          )}
          {children}
        </div>

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-text-dim hover:text-text-muted transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  },
);
Toast.displayName = 'Toast';

/* -------------------------------------------------------------------------- */
/*  ToastContainer -- viewport for stacked toasts                              */
/* -------------------------------------------------------------------------- */

const ToastContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2',
      'pointer-events-none [&>*]:pointer-events-auto',
      className,
    )}
    {...props}
  />
));
ToastContainer.displayName = 'ToastContainer';

/* -------------------------------------------------------------------------- */
/*  useToast -- minimal toast state manager                                    */
/* -------------------------------------------------------------------------- */

export interface ToastData {
  id: string;
  variant?: 'default' | 'success' | 'error' | 'warning';
  title?: string;
  description?: string;
  duration?: number;
}

interface ToastState {
  toasts: ToastData[];
}

type ToastAction =
  | { type: 'ADD'; toast: ToastData }
  | { type: 'DISMISS'; id: string };

function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case 'ADD':
      return { toasts: [...state.toasts, action.toast] };
    case 'DISMISS':
      return { toasts: state.toasts.filter((t) => t.id !== action.id) };
    default:
      return state;
  }
}

let toastCount = 0;

function genId() {
  toastCount = (toastCount + 1) % Number.MAX_SAFE_INTEGER;
  return `toast-${toastCount}-${Date.now()}`;
}

// Singleton listeners so the hook and the imperative `toast()` share state.
const listeners: Array<(state: ToastState) => void> = [];
let memoryState: ToastState = { toasts: [] };

function dispatch(action: ToastAction) {
  memoryState = toastReducer(memoryState, action);
  listeners.forEach((l) => l(memoryState));
}

/**
 * Imperative toast function -- call from anywhere.
 *
 * ```ts
 * toast({ title: 'Saved', variant: 'success' });
 * ```
 */
export function toast(data: Omit<ToastData, 'id'>) {
  const id = genId();
  const duration = data.duration ?? 4000;

  dispatch({ type: 'ADD', toast: { ...data, id } });

  if (duration > 0) {
    setTimeout(() => {
      dispatch({ type: 'DISMISS', id });
    }, duration);
  }

  return id;
}

/**
 * React hook -- returns current toasts and a dismiss function.
 */
export function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const idx = listeners.indexOf(setState);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  return {
    toasts: state.toasts,
    dismiss: (id: string) => dispatch({ type: 'DISMISS', id }),
    toast,
  };
}

/* -------------------------------------------------------------------------- */
/*  Toaster -- drop this once in your app layout                               */
/* -------------------------------------------------------------------------- */

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastContainer>
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-slide-up"
        >
          <Toast
            variant={t.variant}
            title={t.title}
            description={t.description}
            onClose={() => dismiss(t.id)}
          />
        </div>
      ))}
    </ToastContainer>
  );
}

export { Toast, ToastContainer, toastVariants };
