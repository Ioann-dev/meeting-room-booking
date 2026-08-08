import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CapacityFilterProps {
  value: string;
  onChange: (value: string) => void;
  /** Real, already-fetched result count; omitted while the room list is still loading. */
  resultCount?: number;
}

/**
 * A single-row toolbar (label beside the control, not stacked above it like
 * FormField's default) so the whole thing lands in the ~76-92px desktop
 * height band a filter bar should occupy, rather than a full form-field
 * stack's taller footprint. Built directly on Input rather than FormField
 * for that reason; the label/control association (htmlFor/id) is still
 * explicit, so this loses none of FormField's accessibility, just its
 * vertical layout.
 */
export function CapacityFilter({ value, onChange, resultCount }: CapacityFilterProps) {
  const inputId = useId();

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-border bg-surface px-5 py-5 shadow-sm">
      <div className="flex items-center gap-3">
        <label htmlFor={inputId} className="whitespace-nowrap text-sm font-medium text-ink">
          Minimum capacity
        </label>
        <Input
          id={inputId}
          type="number"
          inputMode="numeric"
          min={1}
          max={100}
          step={1}
          placeholder="Any"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={`${inputId}-hint`}
          className="w-24 tabular-nums"
        />
      </div>
      <p id={`${inputId}-hint`} className="text-xs text-ink-subtle">
        Rooms that fit at least this many people
      </p>
      {value && (
        <Button type="button" variant="ghost" onClick={() => onChange('')}>
          Clear
        </Button>
      )}
      {/* Real, already-fetched count -- never a separate request made just
          to show a number here (see SchedulePage, which passes the same
          rooms array it already renders below). */}
      {resultCount !== undefined && (
        <p className="ml-auto whitespace-nowrap text-sm text-ink-subtle" aria-live="polite">
          <span className="tabular-nums font-medium text-ink">{resultCount}</span>{' '}
          {resultCount === 1 ? 'room' : 'rooms'}
        </p>
      )}
    </div>
  );
}
