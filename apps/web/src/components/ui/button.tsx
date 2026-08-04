import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './spinner';

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-strong',
  secondary: 'border border-border bg-surface text-ink hover:border-border-strong hover:bg-canvas',
  destructive: 'bg-danger text-white hover:bg-danger-strong',
  ghost: 'text-ink-muted hover:bg-canvas hover:text-ink',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', loading = false, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
});
