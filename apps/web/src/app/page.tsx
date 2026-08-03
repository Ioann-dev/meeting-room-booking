import { ApiStatus } from '@/components/api-status';
import { AccountStatus } from '@/components/account-status';

export default function Home() {
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-12">
      <h1 className="text-2xl font-semibold">Meeting Room Booking</h1>
      <ApiStatus />
      <AccountStatus />
    </main>
  );
}
