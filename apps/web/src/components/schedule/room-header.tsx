import Link from 'next/link';
import type { RoomSummary } from 'shared';
import { Button } from '@/components/ui/button';

interface RoomHeaderProps {
  room: RoomSummary;
  onBook: (trigger: HTMLButtonElement) => void;
}

export function RoomHeader({ room, onBook }: RoomHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
      <div>
        <Link
          href="/schedule"
          className="text-xs font-medium text-ink-subtle transition-colors hover:text-ink"
        >
          ← All rooms
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-ink">{room.name}</h1>
      </div>
      {/* items-end, not items-center: bottom-aligns the metadata text
          against the button's own bottom edge rather than its vertical
          center, which is what actually lines up cleanly against the
          left group's h1 baseline (a button's own text doesn't align to
          plain text the way items-baseline assumes across mixed element
          types). */}
      <div className="flex items-end gap-3">
        <p className="text-sm text-ink-subtle">
          Floor {room.floor} · Seats <span className="tabular-nums">{room.capacity}</span>
        </p>
        <Button type="button" onClick={(event) => onBook(event.currentTarget)}>
          Book a room
        </Button>
      </div>
    </div>
  );
}
