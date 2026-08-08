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

// Backgrounds carry a ~13% saturation boost (with a slight lightness trim)
// over the first pass, and borders a ~10% boost, per the visual-polish
// brief's "10-15% richer, still AA" instruction -- title-vs-background
// contrast was recomputed for every entry after the shift (lowest is cyan
// at 5.43:1, still clear of the 4.5:1 floor) rather than assumed safe.
export const EVENT_PALETTE: readonly EventColor[] = [
  { name: 'purple', background: '#E8E1FF', border: '#7250EF', title: '#3F2B89' },
  { name: 'blue', background: '#DCEAFF', border: '#2B75FF', title: '#174A9D' },
  { name: 'cyan', background: '#D4F7FD', border: '#0DAED0', title: '#096B7D' },
  { name: 'mint', background: '#D5F8E9', border: '#19B47C', title: '#11694C' },
  { name: 'pink', background: '#FCDAEE', border: '#E0489E', title: '#87275D' },
  { name: 'coral', background: '#FFDFDA', border: '#F36552', title: '#8E392D' },
  { name: 'amber', background: '#FFF0CD', border: '#DF9D1D', title: '#81580C' },
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
