import { render, screen } from '@testing-library/react';
import { SlotCell } from './slot-cell';

function renderCell(props: Partial<React.ComponentProps<typeof SlotCell>> = {}) {
  return render(
    <SlotCell
      isPast={false}
      isSelected={false}
      label="09:00 on Mon 8/3"
      gridColumn={2}
      gridRow={2}
      {...props}
    />,
  );
}

describe('SlotCell baseline row height', () => {
  it('renders the free-slot button as block-level, filling its grid cell', () => {
    renderCell();
    const button = screen.getByRole('button');
    // A bare <button> defaults to inline-block, which reserves extra
    // baseline-alignment space and can silently inflate its grid track
    // past the shared --slot-h unit -- `block` (plus the default grid-item
    // stretch that fills the assigned cell on both axes) is what removes
    // that inline formatting context.
    expect(button.className).toContain('block');
  });

  it('renders a non-interactive placeholder for a past slot', () => {
    renderCell({ isPast: true });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
