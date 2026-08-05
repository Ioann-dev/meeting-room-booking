import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { RoomScheduleView } from './room-schedule-view';

function ScheduleSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-10 w-full" />
      <div className="flex flex-col gap-1">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-10" />
        ))}
      </div>
    </div>
  );
}

export default function RoomSchedulePage() {
  return (
    <Suspense fallback={<ScheduleSkeleton />}>
      <RoomScheduleView />
    </Suspense>
  );
}
