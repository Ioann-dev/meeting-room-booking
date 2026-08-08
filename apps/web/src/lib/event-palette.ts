/**
 * Seven-hue palette for other-attendees' bookings (own bookings always use
 * the fixed teal ownership treatment instead -- see BookingBlock). Colors
 * are frontend presentation only, never persisted; a booking's color is
 * re-derived from its `id` on every render via `paletteForId`, not stored.
 */
export interface EventColor {
  name: string;
  background: string;
  border: string;
  title: string;
}

export const EVENT_PALETTE: readonly EventColor[] = [
  { name: 'purple', background: '#EEE9FF', border: '#7657E8', title: '#3F2B89' },
  { name: 'blue', background: '#E4EFFF', border: '#3478F6', title: '#174A9D' },
  { name: 'cyan', background: '#DDF7FB', border: '#16A8C7', title: '#096B7D' },
  { name: 'mint', background: '#DDF7EC', border: '#20AD7A', title: '#11694C' },
  { name: 'pink', background: '#FBE3F1', border: '#D94F9D', title: '#87275D' },
  { name: 'coral', background: '#FDE7E3', border: '#EC6B59', title: '#8E392D' },
  { name: 'amber', background: '#FFF2D5', border: '#D69A26', title: '#81580C' },
];

/**
 * Deterministic djb2 string hash -- same booking id always maps to the same
 * palette entry across renders/reloads, so an event's color never flickers
 * or randomly changes as the schedule refreshes.
 */
function hashString(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return hash >>> 0;
}

export function paletteForId(id: string): EventColor {
  const index = hashString(id) % EVENT_PALETTE.length;
  return EVENT_PALETTE[index]!;
}
