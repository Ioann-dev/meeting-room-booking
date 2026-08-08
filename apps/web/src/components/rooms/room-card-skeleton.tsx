import { Skeleton } from '@/components/ui/skeleton';

/**
 * Mirrors RoomCard's own structure (top accent strip, title, floor line,
 * capacity chip) rather than one anonymous rectangle -- the loading grid
 * reads as "rooms are coming" instead of a generic placeholder block.
 */
export function RoomCardSkeleton() {
  return (
    <div className="relative flex h-full flex-col gap-5 overflow-hidden rounded-lg border border-border bg-surface p-6">
      <Skeleton className="absolute inset-x-0 top-0 h-[3px] rounded-none" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-2.5 w-1/3" />
        </div>
      </div>
      <Skeleton className="mt-auto h-7 w-24 rounded-full" />
    </div>
  );
}
