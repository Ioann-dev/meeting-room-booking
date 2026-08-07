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
        // the current 14px desktop size unchanged. py-3 (44px) below md:
        // matches this app's established touch-target bar (see Button);
        // md:py-2 restores the current desktop density unchanged.
        'w-full rounded-md border border-border bg-surface px-3 py-3 text-base text-ink transition-colors placeholder:text-ink-faint md:py-2 md:text-sm',
        'hover:border-border-strong focus:border-accent',
        'disabled:cursor-not-allowed disabled:bg-canvas disabled:text-ink-faint',
        'aria-[invalid=true]:border-danger aria-[invalid=true]:focus:border-danger',
        className,
      )}
      {...props}
    />
  );
});
