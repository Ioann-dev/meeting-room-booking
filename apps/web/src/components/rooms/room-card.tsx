import Link from 'next/link';
import type { RoomSummary } from 'shared';

export function RoomCard({ room }: { room: RoomSummary }) {
  return (
    <Link
      href={`/schedule/${room.id}`}
      // shadow-sm at rest, stepping up to a still-soft (not shadow-md/
      // overlay-strength) shadow on hover: the restrained-lift clickability
      // cue DESIGN.md's Cards section documents, alongside the existing
      // border/background shift rather than replacing it.
      className="group relative flex h-full flex-col gap-5 rounded-lg border border-border bg-surface p-5 shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_10px_24px_-8px_rgb(15_23_32_/_0.16)]"
      // The three stacked text nodes below (name, floor, capacity) have no
      // punctuation or separators between them visually -- fine to read at
      // a glance, but their concatenated text content is what a screen
      // reader announces by default ("AthensFloor 1Seats 4", one run-on
      // token). An explicit aria-label states the same three facts properly
      // punctuated without changing any visible copy.
      aria-label={`${room.name}, Floor ${room.floor}, Seats ${room.capacity}`}
    >
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
