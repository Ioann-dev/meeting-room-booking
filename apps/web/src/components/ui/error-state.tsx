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
      className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface px-6 py-12 text-center"
    >
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && <p className="text-sm text-ink-subtle">{description}</p>}
      {onRetry && (
        <Button type="button" variant="secondary" onClick={onRetry} className="mt-2">
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
