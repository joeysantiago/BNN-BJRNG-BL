/** Calendar maths on YYYY-MM-DD strings, done in UTC so a time-zone or daylight-saving change never moves a day. */

/** The day as a UTC Date, for Intl formatting with `timeZone: 'UTC'`. */
export const dayDate = (iso: string): Date => new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))));

const toIso = (date: Date): string => date.toISOString().slice(0, 10);

export const addDays = (iso: string, days: number): string => {
  const date = dayDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIso(date);
};

/** Moves by whole months and keeps the day where it can: 31-01 + 1 month = 28-02 (or 29-02). */
export const addMonths = (iso: string, months: number): string => {
  const date = dayDate(iso);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return toIso(date);
};

export const monthStart = (iso: string): string => `${iso.slice(0, 7)}-01`;

export const monthEnd = (iso: string): string => toIso(new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)), 0)));

/** 0 = Sunday … 6 = Saturday. */
export const weekday = (iso: string): number => dayDate(iso).getUTCDay();

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export const daysBetween = (from: string, to: string): number => Math.round((dayDate(to).getTime() - dayDate(from).getTime()) / 86400000);

/** The day moved inside [min, max]; an empty bound is open. */
export const clampDay = (iso: string, min: string, max: string): string => (min && iso < min ? min : max && iso > max ? max : iso);
