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
        // restores the current 36px desktop density unchanged. Transition
        // covers color/shadow/transform together (not just transition-
        // colors) so the shadow shift on hover and the press-scale below
        // both animate smoothly on the same premium easing curve instead
        // of snapping instantly.
        'inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-premium md:py-2',
        // A small press-down scale, not just a color change -- disabled
        // buttons keep :active inert (the disabled attribute itself
        // prevents the pseudo-class from ever matching), so this never
        // fires on a non-interactive button.
        'active:scale-[0.98]',
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
