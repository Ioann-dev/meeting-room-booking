import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          // Same iOS-zoom rationale as Input: text-base below md:, text-sm
          // restored at md:+. Same py-3/md:py-2 touch-target treatment too.
          'w-full appearance-none rounded-md border border-border bg-surface px-3 py-3 pr-8 text-base text-ink transition-[border-color,box-shadow] duration-150 ease-premium md:py-2 md:text-sm',
          'hover:border-border-strong focus:border-accent',
          'focus-visible:ring-4 focus-visible:ring-primary-soft',
          'disabled:cursor-not-allowed disabled:bg-canvas disabled:text-ink-faint',
          'aria-[invalid=true]:border-danger',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="m5.5 7.5 4.5 5 4.5-5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
});
