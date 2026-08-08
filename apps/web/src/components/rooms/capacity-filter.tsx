import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

interface CapacityFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function CapacityFilter({ value, onChange }: CapacityFilterProps) {
  return (
    // bg-surface (white) + shadow-sm, not the previous flat gray-soft
    // fill -- reads as its own light card rather than a muted, slightly
    // "disabled-looking" strip, consistent with the app's general
    // brighter-background direction.
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface px-4 py-3.5 shadow-sm">
      <div className="w-40">
        <FormField label="Minimum capacity" hint="Rooms that fit at least this many people">
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            step={1}
            placeholder="Any"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="tabular-nums"
          />
        </FormField>
      </div>
      {value && (
        <Button type="button" variant="ghost" onClick={() => onChange('')}>
          Clear
        </Button>
      )}
    </div>
  );
}
