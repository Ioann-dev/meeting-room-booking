import { Button } from './button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  retryLabel = 'Retry',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3.5 rounded-lg border border-border bg-surface px-6 py-16 text-center shadow-sm"
    >
      <span
        aria-hidden="true"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-tint text-danger"
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
          <path
            d="M10 3 2.5 16.5h15L10 3Z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path d="M10 8v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="10" cy="14.2" r="0.9" fill="currentColor" />
        </svg>
      </span>
      <div className="flex max-w-xs flex-col gap-1.5">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {description && <p className="text-sm text-ink-subtle">{description}</p>}
      </div>
      {onRetry && (
        <Button type="button" variant="secondary" onClick={onRetry} className="mt-1">
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
