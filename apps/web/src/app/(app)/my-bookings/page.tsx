import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { MyBookingsView } from './my-bookings-view';

function MyBookingsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-full" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-16" />
        ))}
      </div>
    </div>
  );
}

export default function MyBookingsPage() {
  return (
    <Suspense fallback={<MyBookingsSkeleton />}>
      <MyBookingsView />
    </Suspense>
  );
}
