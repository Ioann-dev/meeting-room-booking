'use client';

import { cloneElement, isValidElement, useId, type ReactElement } from 'react';

interface FieldControlProps {
  id?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  children: ReactElement<FieldControlProps>;
}

export function FormField({ label, error, hint, children }: FormFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ');

  const control = isValidElement<FieldControlProps>(children)
    ? cloneElement(children, {
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': describedBy || undefined,
      })
    : children;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {control}
      {hint && !error && (
        <p id={hintId} className="text-xs text-ink-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
