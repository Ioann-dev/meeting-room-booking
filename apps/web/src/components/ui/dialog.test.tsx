import { render, screen } from '@testing-library/react';
import { Dialog } from './dialog';

describe('Dialog accessible semantics', () => {
  it('exposes role="dialog" and aria-modal="true" when open', () => {
    render(
      <Dialog open onOpenChange={() => {}} title="Booking title">
        Detail content
      </Dialog>,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('renders nothing when closed', () => {
    render(
      <Dialog open={false} onOpenChange={() => {}} title="Booking title">
        Detail content
      </Dialog>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
