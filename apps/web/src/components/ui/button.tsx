import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './spinner';

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-white shadow-primary hover:bg-accent-strong hover:shadow-primary-hover active:bg-primary-active',
  // Hover/pressed now read as "subtle violet" (primary-soft tint + a
  // primary-tinted border and label) instead of the previous plain gray
  // wash -- still a white button at rest, per the brief, but its
  // interactive states now belong to the same violet system primary
  // uses rather than reading as a neutral gray control.
  secondary:
    'border border-border bg-surface text-ink shadow-sm hover:border-primary hover:bg-primary-soft hover:text-primary-active active:bg-primary-soft active:border-primary-hover',
  destructive: 'bg-danger text-white shadow-sm hover:bg-danger-strong active:bg-danger-active',
  ghost: 'text-ink-muted hover:bg-surface-hover hover:text-ink',
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
        // py-3 (44px) below md: matches this app's established touch-target
        // bar (see SlotCell/BookingBlock's min-h-11/md:min-h-8); md:py-2
        // restores the current 36px desktop density unchanged.
        'inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-medium transition-colors md:py-2',
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
