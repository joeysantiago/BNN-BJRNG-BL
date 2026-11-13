import { TrackerAlertType, TrackerCategory, TrackerFilter, TrackerMethod } from './models/tracker.model';

/**
 * SnapTracker's fixed lists, the same as the prototype (App-Prototype/assets/js/snaptracker.js). In the API branches they are the seed rows of
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

/** Registered SMS headers (DLT) of banks and payment apps that SnapTracker reads. Everything else is ignored. */
export const TRACKER_SENDERS: Readonly<Record<string, string>> = {
  HDFCBK: 'HDFC Bank', HDFCBN: 'HDFC Bank', ICICIB: 'ICICI Bank', ICICIT: 'ICICI Bank', SBIINB: 'State Bank of India', SBIUPI: 'SBI UPI', CBSSBI: 'State Bank of India', ATMSBI: 'State Bank of India',
  AXISBK: 'Axis Bank', KOTAKB: 'Kotak Mahindra Bank', YESBNK: 'Yes Bank', IDFCFB: 'IDFC First Bank', INDUSB: 'IndusInd Bank', PNBSMS: 'Punjab National Bank',
  BOBTXN: 'Bank of Baroda', BOBSMS: 'Bank of Baroda', FEDBNK: 'Federal Bank', FEDSMS: 'Federal Bank', SLCBNK: 'slice', CANBNK: 'Canara Bank', UNIONB: 'Union Bank', PAYTMB: 'Paytm', PHONPE: 'PhonePe', GPAYIN: 'Google Pay', AMZPAY: 'Amazon Pay',
};

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
