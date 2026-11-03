import { Lang, langInfo } from './site';
import { KhataCurrency, KhataEntry, KhataEntryGroup } from './models/khata.model';

/** Amounts travel as whole smallest units (paise). Typed text is turned into those units digit by digit, never through floating point. */
export const toMinor = (text: string, decimals: number): number | null => {
  const clean = text.trim().replace(/[,\s]/g, '');
  const match = /^(\d{1,15})(?:\.(\d*))?$/.exec(clean);
  if (!match || (match[2] ?? '').length > decimals)
    return null;
  const minor = Number(match[1] + (match[2] ?? '').padEnd(decimals, '0'));
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
};

/** The plain number for an edit field: 150000 paise -> "1500.00". */
export const fromMinor = (minor: number, decimals: number): string => {
  const sign = minor < 0 ? '-' : '';
  const digits = String(Math.abs(minor)).padStart(decimals + 1, '0');
  return decimals ? `${sign}${digits.slice(0, -decimals)}.${digits.slice(-decimals)}` : sign + digits;
};

/** Amount for display in the reader's language: "₹1,500.00". Real currency codes use Intl; custom money types put their symbol in front. */
export const formatMoney = (minor: number, currency: KhataCurrency, lang: Lang): string => {
  const value = Math.abs(minor) / 10 ** currency.decimals;
  const locale = langInfo(lang).locale.replace('_', '-');
  const options = { minimumFractionDigits: currency.decimals, maximumFractionDigits: currency.decimals };
  if (currency.isIso)
    try {
      return new Intl.NumberFormat(locale, { ...options, style: 'currency', currency: currency.code }).format(value);
    } catch {
      /* unknown code: fall through to the symbol */
    }
  return `${currency.symbol} ${new Intl.NumberFormat(locale, options).format(value)}`;
};

/** API dates are YYYY-MM-DD; the UI always shows DD-MM-YYYY (App-Document/date-format.md). */
export const formatDate = (iso?: string | null): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
};

/** Today in the browser's own time zone, as YYYY-MM-DD for the API and for date inputs. */
export const todayIso = (): string => isoDay(new Date());

const locale = (lang: Lang): string => langInfo(lang).locale.replace('_', '-');

/** "Mar" or "March 2026" for a month key "2026-03", in the reader's language. */
export const monthName = (key: string, long: boolean, lang: Lang): string => new Intl.DateTimeFormat(locale(lang), long ? { month: 'long', year: 'numeric' } : { month: 'short' }).format(new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1));

/** Short chart axis amount such as 12K, in the reader's language. */
export const compactAmount = (minor: number, currency: KhataCurrency, lang: Lang): string => new Intl.NumberFormat(locale(lang), { notation: 'compact', maximumFractionDigits: 1 }).format(minor / 10 ** currency.decimals);

/** YYYY-MM-DD of a date in the browser's time zone. */
export const isoDay = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Field checks of the party form, so the wrong field can be marked: a name of 1 to 100 characters; mobile and email optional but valid when given. */
export const contactErrors = (name: string, mobile: string, email: string): Record<string, boolean> => ({
  name: !name || name.length > 100,
  mobile: !!mobile && !/^\+?[\d\s-]{7,16}$/.test(mobile),
  email: !!email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
});

/** Puts entries under a heading per month ("March 2026"), in the order they come. */
export const groupByMonth = (entries: KhataEntry[], lang: Lang): KhataEntryGroup[] => {
  const groups: KhataEntryGroup[] = [];
  for (const e of entries) {
    const key = e.entryDate.slice(0, 7);
    if (groups.at(-1)?.key !== key)
      groups.push({ key, label: monthName(key, true, lang), entries: [] });
    groups.at(-1)!.entries.push(e);
  }
  return groups;
};
