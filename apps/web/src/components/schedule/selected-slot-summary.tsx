'use client';

import { Button } from '@/components/ui/button';

interface SelectedSlotSummaryProps {
  label: string;
  onClear: () => void;
}

export function SelectedSlotSummary({ label, onClear }: SelectedSlotSummaryProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-accent/30 bg-accent-tint px-4 py-2.5 text-sm">
      <p className="text-ink">
        <span className="font-medium text-accent-strong">Selected slot:</span> {label}
      </p>
      <Button type="button" variant="ghost" onClick={onClear} className="px-2 py-1 text-xs">
        Clear selection
      </Button>
    </div>
  );
}
