import { Skeleton } from '@/components/ui/skeleton';

/**
 * Mirrors BookingRow's own structure (date tile, title, room/time line,
 * trailing action) rather than one anonymous bar -- the loading list reads
 * as "bookings are coming" instead of a generic placeholder block.
 */
export function BookingRowSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-surface px-4 py-3.5">
      <Skeleton className="h-12 w-12 shrink-0 rounded-md" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
      <Skeleton className="h-8 w-16 shrink-0 rounded-md" />
    </div>
  );
}
