import { TrackerAlertType, TrackerBankMeta, TrackerCategory, TrackerFilter, TrackerMethod } from './models/tracker.model';

/**
 * Tracker's fixed lists, the same as the prototype (App-Prototype/assets/js/snaptracker.js). In the API branches they are the seed rows of
 * INSERT/Tracker (TrackerCategories, TrackerSenders); names show through translation keys (tracker.cat.<code>, tracker.method.<code>).
 */
export const TRACKER_CATEGORIES: readonly TrackerCategory[] = [
  { code: 'food', emoji: '🍜', color: '#f97316' },
  { code: 'groceries', emoji: '🛒', color: '#84cc16' },
  { code: 'shopping', emoji: '🛍️', color: '#ec4899' },
  { code: 'transport', emoji: '🚕', color: '#eab308' },
  { code: 'fuel', emoji: '⛽', color: '#b45309' },
  { code: 'bills', emoji: '💡', color: '#06b6d4' },
  { code: 'entertainment', emoji: '🎬', color: '#8b5cf6' },
  { code: 'health', emoji: '💊', color: '#ef4444' },
  { code: 'travel', emoji: '✈️', color: '#3b82f6' },
  { code: 'rent', emoji: '🏠', color: '#64748b' },
  { code: 'cash', emoji: '🏧', color: '#94a3b8' },
  { code: 'investment', emoji: '📈', color: '#10b981' },
  { code: 'emi', emoji: '🏦', color: '#a855f7' },
  { code: 'salary', emoji: '💼', color: '#22c55e' },
  { code: 'transfer', emoji: '🔁', color: '#6366f1' },
  { code: 'refund', emoji: '↩️', color: '#14b8a6' },
  { code: 'other', emoji: '🧾', color: '#9ca3af' },
];

/** Registered SMS headers (DLT) of banks and payment apps that Tracker reads. Everything else is ignored. */
export const TRACKER_SENDERS: Readonly<Record<string, string>> = {
  HDFCBK: 'HDFC Bank', HDFCBN: 'HDFC Bank', ICICIB: 'ICICI Bank', ICICIT: 'ICICI Bank', SBIINB: 'State Bank of India', SBIUPI: 'SBI UPI', CBSSBI: 'State Bank of India', ATMSBI: 'State Bank of India',
  AXISBK: 'Axis Bank', KOTAKB: 'Kotak Mahindra Bank', YESBNK: 'Yes Bank', IDFCFB: 'IDFC First Bank', INDUSB: 'IndusInd Bank', PNBSMS: 'Punjab National Bank',
  BOBTXN: 'Bank of Baroda', BOBSMS: 'Bank of Baroda', FEDBNK: 'Federal Bank', FEDSMS: 'Federal Bank', FEDFIB: 'Federal Bank', SBICRD: 'SBI Card', MYSBIC: 'SBI Card', CITIBA: 'Citibank', SLCBNK: 'slice', CANBNK: 'Canara Bank', UNIONB: 'Union Bank', PAYTMB: 'Paytm', PHONPE: 'PhonePe', GPAYIN: 'Google Pay', AMZPAY: 'Amazon Pay',
};

/**
 * The banks and payment apps of TRACKER_SENDERS: the logo in public/banks (null: no clean logo file, the badge shows the short name on the brand colour)
 * and the sender codes that are theirs. The sources and licences of the logos are in public/banks/SOURCES.md.
 */
export const TRACKER_BANKS: readonly TrackerBankMeta[] = [
  { codes: ['HDFCBK', 'HDFCBN'], logo: 'hdfcbk.svg', short: 'HDFC', color: '#004c8f' },
  { codes: ['ICICIB', 'ICICIT'], logo: 'icicib.svg', short: 'ICICI', color: '#ae282e' },
  { codes: ['SBIINB', 'SBIUPI', 'CBSSBI', 'ATMSBI'], logo: 'sbiinb.svg', short: 'SBI', color: '#22409a' },
  { codes: ['AXISBK'], logo: 'axisbk.svg', short: 'Axis', color: '#97144d' },
  { codes: ['KOTAKB'], logo: null, short: 'Kotak', color: '#003874' },
  { codes: ['YESBNK'], logo: null, short: 'Yes', color: '#00518f' },
  { codes: ['IDFCFB'], logo: 'idfcfb.svg', short: 'IDFC', color: '#9c1d26' },
  { codes: ['INDUSB'], logo: null, short: 'IndusInd', color: '#98272a' },
  { codes: ['PNBSMS'], logo: 'pnbsms.svg', short: 'PNB', color: '#a20a3a' },
  { codes: ['BOBTXN', 'BOBSMS'], logo: null, short: 'BoB', color: '#c4441a' },
  { codes: ['FEDBNK', 'FEDSMS', 'FEDFIB'], logo: 'fedbnk.svg', short: 'Federal', color: '#0a4d8c' },
  { codes: ['SBICRD', 'MYSBIC'], logo: 'sbiinb.svg', short: 'SBI Card', color: '#22409a' },
  { codes: ['CITIBA'], logo: null, short: 'Citi', color: '#056dae' },
  { codes: ['SLCBNK'], logo: null, short: 'slice', color: '#5b21b6' },
  { codes: ['CANBNK'], logo: 'canbnk.svg', short: 'Canara', color: '#0072bc' },
  { codes: ['UNIONB'], logo: 'unionb.svg', short: 'Union', color: '#c8102e' },
  { codes: ['PAYTMB'], logo: null, short: 'Paytm', color: '#002e6e' },
  { codes: ['PHONPE'], logo: 'phonpe.svg', short: 'PhonePe', color: '#5f259f' },
  { codes: ['GPAYIN'], logo: 'gpayin.svg', short: 'GPay', color: '#1a5fd0' },
  { codes: ['AMZPAY'], logo: null, short: 'Amazon Pay', color: '#232f3e' },
];

/** The bank of a sender code ("HDFCBK", or a full header such as "AD-HDFCBK"), or null for none or one that is not known. */
export const trackerBank = (code: string | null | undefined): TrackerBankMeta | null => (code ? TRACKER_BANKS.find((b) => b.codes.includes(code.toUpperCase().split('-').pop() ?? '')) ?? null : null);

/** The ways money moves, in the order of the manual form. */
export const TRACKER_METHODS: readonly TrackerMethod[] = ['upi', 'debitCard', 'creditCard', 'card', 'netBanking', 'neft', 'imps', 'rtgs', 'atm', 'bank', 'cash'];

/** The alert types, in the order of the settings. */
export const TRACKER_ALERT_TYPES: readonly TrackerAlertType[] = ['newTx', 'categorized', 'verify', 'duplicate', 'revoked', 'paused', 'sync'];

/** The emoji of each alert type. */
export const TRACKER_ALERT_ICONS: Readonly<Record<TrackerAlertType, string>> = { newTx: '⚡', categorized: '🏷️', verify: '🔎', duplicate: '🧬', revoked: '⛔', paused: '⏸️', sync: '🔄' };

/** The lists of the Activity screen, in their order. */
export const TRACKER_FILTERS: readonly TrackerFilter[] = ['all', 'sms', 'manual', 'pending', 'credit', 'debit', 'dup', 'ignored'];

/** The category of a code, or "Others" for one that is not known. */
export const trackerCategory = (code: string): TrackerCategory => TRACKER_CATEGORIES.find((c) => c.code === code) ?? TRACKER_CATEGORIES[TRACKER_CATEGORIES.length - 1];
