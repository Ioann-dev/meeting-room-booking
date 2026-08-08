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
      className="flex h-full flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-sm transition-[background-color,border-color,box-shadow] hover:border-border-strong hover:bg-canvas hover:shadow-[0_4px_14px_-4px_rgb(15_23_32_/_0.14)]"
      // The three stacked text nodes below (name, floor, capacity) have no
      // punctuation or separators between them visually -- fine to read at
      // a glance, but their concatenated text content is what a screen
      // reader announces by default ("AthensFloor 1Seats 4", one run-on
      // token). An explicit aria-label states the same three facts properly
      // punctuated without changing any visible copy.
      aria-label={`${room.name}, Floor ${room.floor}, Seats ${room.capacity}`}
    >
      <div aria-hidden="true">
        <p className="text-sm font-semibold text-ink">{room.name}</p>
        <p className="mt-0.5 text-xs text-ink-subtle">Floor {room.floor}</p>
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
