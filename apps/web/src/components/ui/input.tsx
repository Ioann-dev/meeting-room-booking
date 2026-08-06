import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        // text-base (16px) below md: iOS Safari auto-zooms on focusing any
        // input with a computed font-size under 16px; md:text-sm restores
        // the current 14px desktop size unchanged.
        'w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-ink transition-colors placeholder:text-ink-faint md:text-sm',
        'hover:border-border-strong focus:border-accent',
        'disabled:cursor-not-allowed disabled:bg-canvas disabled:text-ink-faint',
        'aria-[invalid=true]:border-danger aria-[invalid=true]:focus:border-danger',
        className,
      )}
      {...props}
    />
  );
});
