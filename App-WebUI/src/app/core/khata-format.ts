import { Lang, langInfo } from './site';
import { KhataCurrency } from './models/khata.model';

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
export const todayIso = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
