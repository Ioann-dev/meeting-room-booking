'use client';

import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  type ReactElement,
  type ReactNode,
} from 'react';

interface FieldControlProps {
  id?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

interface FormFieldProps {
  label: string;
  error?: string;
  /**
   * A plain string for the common case; a caller needing its own inline
   * styling (e.g. a character counter that recolors at its limit) can pass
   * a node instead -- the wrapping <p>'s own text-xs/text-ink-subtle still
   * applies as the default, a child element's own color class overrides it
   * exactly where that child sets one.
   */
  hint?: ReactNode;
  children: ReactElement<FieldControlProps>;
}

export function FormField({ label, error, hint, children }: FormFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ');

  // Moves focus to the first invalid field whenever a validation error
  // appears, so a screen-reader user (or anyone who submitted without
  // looking) actually lands on it instead of only hearing/seeing nothing
  // change. By the time this effect runs, every FormField's aria-invalid
  // has already been committed to the DOM (React commits DOM changes
  // before any passive effect fires) -- checking "am I the first invalid
  // field in the document" here is what makes this correct regardless of
  // which sibling FormField's own effect happens to run first, since a
  // naive "always focus on error" in each instance would let whichever
  // one commits last win instead of the first field in reading order.
  useEffect(() => {
    if (!error) {
      return;
    }
    const el = document.getElementById(id);
    if (el && document.querySelector('[aria-invalid="true"]') === el) {
      el.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately re-runs only when the error text itself changes, not on every render
  }, [error]);

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
