// IANA identifier, never a fixed UTC offset -- Kyiv moves between EET
// (UTC+2) and EEST (UTC+3), and only a named zone lets a time library
// resolve the correct offset for any given date.
export const OFFICE_TIMEZONE = 'Europe/Kyiv';

export const OFFICE_OPEN_HOUR = 9;
export const OFFICE_CLOSE_HOUR = 19;

export const SLOT_MINUTES = 30;
export const MIN_BOOKING_DURATION_MINUTES = SLOT_MINUTES;
export const MAX_BOOKING_DURATION_MINUTES = 4 * 60;
