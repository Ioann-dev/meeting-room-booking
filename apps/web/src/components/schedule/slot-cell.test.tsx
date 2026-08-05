import { render, screen } from '@testing-library/react';
import { SlotCell } from './slot-cell';

function renderInTable(props: Partial<React.ComponentProps<typeof SlotCell>> = {}) {
  return render(
    <table>
      <tbody>
        <tr>
          <SlotCell isPast={false} isSelected={false} label="09:00 on Mon 8/3" {...props} />
        </tr>
      </tbody>
    </table>,
  );
}

describe('SlotCell baseline row height', () => {
  it('renders the free-slot button as block-level, not the browser default inline-block', () => {
    renderInTable();
    const button = screen.getByRole('button');
    // A bare <button> defaults to inline-block, which reserves extra
    // baseline-alignment space inside a table cell and silently inflates
    // every row past its intended 32px/44px unit -- `block` is what removes
    // that inline formatting context.
    expect(button.className).toContain('block');
  });

  it('renders a non-interactive placeholder for a past slot', () => {
    renderInTable({ isPast: true });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
