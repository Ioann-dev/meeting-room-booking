import Link from 'next/link';
import type { RoomSummary } from 'shared';
import { paletteForId } from '@/lib/event-palette';

export function RoomCard({ room }: { room: RoomSummary }) {
  // Same deterministic id-hash palette the calendar's own event colors
  // use (see event-palette.ts) -- a room's accent is therefore stable
  // across reloads and visually consistent with the color system its own
  // bookings will draw from, rather than an unrelated, separately-chosen
  // set of "room colors".
  const accent = paletteForId(room.id);

  return (
    <Link
      href={`/schedule/${room.id}`}
      // shadow-sm at rest, stepping up to a deeper, more premium shadow +
      // a slightly punchier lift on hover (visual-polish pass) -- still
      // restrained, not overlay-strength.
      className="group relative flex h-full flex-col gap-5 overflow-hidden rounded-lg border border-border bg-surface p-5 shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:border-border-strong hover:shadow-[0_14px_28px_-8px_rgb(15_23_32_/_0.2)]"
      // The three stacked text nodes below (name, floor, capacity) have no
      // punctuation or separators between them visually -- fine to read at
      // a glance, but their concatenated text content is what a screen
      // reader announces by default ("AthensFloor 1Seats 4", one run-on
      // token). An explicit aria-label states the same three facts properly
      // punctuated without changing any visible copy.
      aria-label={`${room.name}, Floor ${room.floor}, Seats ${room.capacity}`}
    >
      {/* Top accent strip: a separate positioned element, not a second
          border-*-width utility competing with the card's own `border`
          class on the same CSS property (cn() has no tailwind-merge
          conflict resolution -- see BookingBlock/SlotCell's earlier
          today-tint history for why two same-property classes are a real
          bug risk here, not just a style nit). Restrained (3px, one
          consistent hue per room), not a "different random color per
          card" effect -- the id-hash keeps it stable per room. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ backgroundColor: accent.border }}
      />
      <div aria-hidden="true" className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold tracking-tight text-ink">{room.name}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-faint">
            Floor {room.floor}
          </p>
        </div>
        {/* Chevron: purely decorative reinforcement of the card's own link
            semantics (already the real affordance) -- hidden from the
            accessible tree since the card's aria-label already states
            everything a screen reader needs. Fades/slides in on hover or
            keyboard focus so it never competes with the card at rest. */}
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className="mt-0.5 h-4 w-4 shrink-0 -translate-x-1 text-ink-faint opacity-0 transition-[transform,opacity] duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
        >
          <path
            d="M6 3.5 10.5 8 6 12.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div aria-hidden="true" className="mt-auto flex items-center gap-1.5 text-sm text-ink-muted">
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-ink-faint">
          <path
            d="M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <path
            d="M3.5 17c.6-3.3 3.2-5.5 6.5-5.5s5.9 2.2 6.5 5.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        <span className="tabular-nums">Seats {room.capacity}</span>
      </div>
    </Link>
  );
}
