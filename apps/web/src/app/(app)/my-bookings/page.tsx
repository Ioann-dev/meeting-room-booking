import { Suspense } from 'react';
import { BookingRowSkeleton } from '@/components/my-bookings/booking-row-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { MyBookingsView } from './my-bookings-view';

function MyBookingsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-10 w-48 rounded-lg" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }, (_, index) => (
          <BookingRowSkeleton key={index} />
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
