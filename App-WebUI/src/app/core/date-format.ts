/** A date as DD-MM-YYYY (App-Document/date-format.md). Empty for no date. */
export const formatDate = (value: string | null | undefined): string => {
  const d = value ? new Date(value) : null;
  if (!d || isNaN(d.getTime()))
    return '';
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
};

/** Last Login only (the one exception of date-format.md): DD/MM/YYYY hh:mm AM/PM and the viewer's own named time zone, e.g. "26/10/2026 05:30 PM India Standard Time". */
export const formatDateTimeWithZone = (value: string | null | undefined): string => {
  const d = value ? new Date(value) : null;
  if (!d || isNaN(d.getTime()))
    return '';
  const hours = d.getHours() % 12 || 12;
  const zone = new Intl.DateTimeFormat('en-US', { timeZoneName: 'long' }).formatToParts(d).find((p) => p.type === 'timeZoneName')?.value ?? '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(hours).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'} ${zone}`.trim();
};
