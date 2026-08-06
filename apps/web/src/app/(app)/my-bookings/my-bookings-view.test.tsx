import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyBookingsView } from './my-bookings-view';

const replace = jest.fn();
let searchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/my-bookings',
  useSearchParams: () => searchParams,
}));

jest.mock('@/components/my-bookings/upcoming-section', () => ({
  UpcomingSection: () => <div>Upcoming section content</div>,
}));
jest.mock('@/components/my-bookings/past-section', () => ({
  PastSection: () => <div>Past section content</div>,
}));

beforeEach(() => {
  replace.mockReset();
  searchParams = new URLSearchParams();
});

describe('MyBookingsView', () => {
  it('shows the Upcoming section by default', () => {
    render(<MyBookingsView />);

    expect(screen.getByText('Upcoming section content')).toBeInTheDocument();
    expect(screen.queryByText('Past section content')).not.toBeInTheDocument();
  });

  it('honors a ?tab=past URL param on load', () => {
    searchParams = new URLSearchParams('tab=past');
    render(<MyBookingsView />);

    expect(screen.getByText('Past section content')).toBeInTheDocument();
  });

  it('updates the URL to ?tab=past when the Past tab is clicked', async () => {
    // The URL is the source of truth for which tab is active (see the
    // ?tab=past test above): clicking a tab only needs to request that URL
    // change here, not simulate the full router round-trip that would
    // actually flip the rendered content in a real navigation.
    const user = userEvent.setup();
    render(<MyBookingsView />);

    await user.click(screen.getByRole('tab', { name: 'Past' }));

    expect(replace).toHaveBeenCalledWith('/my-bookings?tab=past');
  });
});
