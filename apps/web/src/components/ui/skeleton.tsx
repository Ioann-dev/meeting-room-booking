import { cn } from '@/lib/cn';

/**
 * A moving shimmer sweep, not a flat pulse -- reads as "actively loading
 * something specific" rather than a generic gray blink, which is what
 * makes a loading state feel intentional/premium instead of a placeholder
 * that was left unstyled. `prefers-reduced-motion` already neutralizes all
 * animation durations app-wide (see globals.css), so this degrades to a
 * static gradient there, same as the old animate-pulse did.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded-md bg-[linear-gradient(90deg,var(--color-surface-soft)_25%,var(--color-surface-hover)_50%,var(--color-surface-soft)_75%)] bg-[length:400%_100%] animate-[premium-shimmer_1.8s_ease-in-out_infinite]',
        className,
      )}
    />
  );
}
