import { TrackerData } from '../models/tracker.model';

/**
 * One account's SnapTracker data in the demo (the TrackerUsers, TrackerTransactions, TrackerSmsTexts, TrackerAlerts, TrackerFilterCounts and
 * TrackerCategoryRules tables of the plan). `rules` maps a merchant (lower case) to the category the user chose for it.
 */
export interface TrackerDemoUser {
  seq: number;
  alertSeq: number;
  data: TrackerData;
  rules: Record<string, string>;
}

/** SnapTracker's part of the demo database, by account id. */
export interface TrackerDemoDb {
  users: Record<number, TrackerDemoUser>;
}

/** What a SnapTracker call answers: a message code (and its values) and data. */
export interface TrackerDemoResult {
  code?: string;
  data?: unknown;
  args?: (string | number)[];
}

/** What the SMS reader found in one message, before the transaction is made. */
export interface TrackerParsed {
  at: number;
  amount: number;
  known: boolean;
  method: string;
  person: boolean;
  isRefund: boolean;
  ambiguous: boolean;
  dateFound: boolean;
  ref: string | null;
  mCat: string | null;
  mKind: string | null;
  account: string | null;
  refText: string | null;
  merchant: string | null;
  amountText: string | null;
  accountText: string | null;
  merchantRaw: string | null;
  type: 'debit' | 'credit' | null;
}

/** A merchant the reader found: its display name, the text it came from, and its category when the dictionary or the wording tells. */
export interface TrackerMerchantFound {
  known?: boolean;
  person?: boolean;
  raw: string | null;
  cat?: string | null;
  name: string | null;
  kind?: string | null;
}
