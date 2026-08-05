import { act, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { UserTimeZoneProvider, useUserTimeZone } from './use-user-time-zone';

jest.mock('@/lib/timezone', () => ({
  detectBrowserTimeZone: jest.fn(() => 'Pacific/Honolulu'),
}));

function Consumer({ label }: { label: string }) {
  const zone = useUserTimeZone();
  return <span data-testid={label}>{zone ?? 'unresolved'}</span>;
}

// Mirrors the real shape: OfficeZoneNotice-like consumer that never
// remounts, alongside a route-like consumer that gets torn down and
// recreated (e.g. navigating from one room's schedule to another's).
function RemountableHarness() {
  const [key, setKey] = useState(0);
  return (
    <UserTimeZoneProvider>
      <Consumer label="persistent" />
      <Consumer key={key} label="remountable" />
      <button type="button" onClick={() => setKey((current) => current + 1)}>
        remount
      </button>
    </UserTimeZoneProvider>
  );
}

describe('UserTimeZoneProvider (L1 desync fix)', () => {
  it('starts unresolved before the detection microtask runs, for SSR/hydration safety', async () => {
    render(<RemountableHarness />);
    expect(screen.getByTestId('persistent')).toHaveTextContent('unresolved');
    expect(screen.getByTestId('remountable')).toHaveTextContent('unresolved');

    // Let the provider's pending microtask settle within act() so React
    // doesn't warn about an update outside act() once the test body returns.
    await act(async () => {
      await Promise.resolve();
    });
  });

  it('resolves once and keeps every consumer -- including one that remounts -- on the same value', async () => {
    render(<RemountableHarness />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId('persistent')).toHaveTextContent('Pacific/Honolulu');
    expect(screen.getByTestId('remountable')).toHaveTextContent('Pacific/Honolulu');

    // Simulate a client-side route change unmounting/remounting just the
    // grid-like consumer, the way Next.js recreates a page component when
    // its dynamic route param changes. Before the fix this would have
    // re-run detection independently in a standalone hook instance; here
    // it's still fed by the same provider, so nothing to re-detect.
    act(() => {
      screen.getByRole('button', { name: 'remount' }).click();
    });

    expect(screen.getByTestId('persistent')).toHaveTextContent('Pacific/Honolulu');
    expect(screen.getByTestId('remountable')).toHaveTextContent('Pacific/Honolulu');
  });
});
