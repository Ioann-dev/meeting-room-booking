/**
 * Shared current-time visual: a thin glowing line plus a small dot at its
 * left edge (the rail-facing side). Used by both SlotCell and BookingBlock
 * so the indicator reads identically whether it crosses a free slot or a
 * booking. Centered on `fraction` via translateY rather than a border-top-
 * at-the-cell's-top-edge approach -- a sub-pixel cosmetic difference, not a
 * geometry one (nothing here affects grid-row/grid-column sizing).
 */
export function CurrentTimeMark({ fraction }: { fraction: number }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 z-10 -translate-y-1/2"
      style={{ top: `${fraction * 100}%` }}
    >
      <div className="h-[2px] w-full bg-current-time shadow-[0_0_4px_rgba(19,169,149,0.55)]" />
      {/* Inset (not straddling the edge with a negative x-translate) so the
          dot stays fully visible even inside BookingBlock's
          overflow-hidden button -- a half-clipped circle at the edge would
          look like a rendering bug rather than a deliberate marker. */}
      <div className="absolute left-0.5 top-1/2 h-[7px] w-[7px] -translate-y-1/2 rounded-full bg-current-time ring-2 ring-surface" />
    </div>
  );
}
