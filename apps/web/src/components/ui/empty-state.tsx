import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-14 text-center">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-ink-faint"
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
          <rect
            x="3"
            y="5"
            width="14"
            height="11"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.3"
          />
          <path d="M3 9h14" stroke="currentColor" strokeWidth="1.3" />
          <path d="M7 3v3M13 3v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        {description && <p className="text-sm text-ink-subtle">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
