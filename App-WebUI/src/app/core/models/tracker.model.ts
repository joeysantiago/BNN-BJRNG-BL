/** Debit = money went out (an expense), credit = money came in. */
export type TrackerType = 'debit' | 'credit';

/** Where a transaction came from: a bank or UPI SMS (pasted, shared or, later, read by the Android app) or typed in by hand. */
export type TrackerSource = 'sms' | 'manual';

/** Pending = waits for the user; auto = approved by the rules; ignored and duplicate are not counted in any total. */
export type TrackerStatus = 'pending' | 'confirmed' | 'auto' | 'ignored' | 'duplicate';

/** What happens to a new SMS transaction: everything waits, approve when sure (smart), or approve everything. */
export type TrackerApproval = 'review' | 'smart' | 'auto';

/** SMS reading on the phone: not allowed yet, on, or paused (allowed, but not reading). */
export type TrackingState = 'permission' | 'enabled' | 'paused';

/** Turn SMS reading on, pause it, resume it or turn it off (POST /tracker/tracking/{action}, and in the Android app the phone too). */
export type TrackerTrackingAction = 'enable' | 'pause' | 'resume' | 'revoke';

/** The lists of the Activity screen. */
export type TrackerFilter = 'all' | 'sms' | 'manual' | 'pending' | 'credit' | 'debit' | 'dup' | 'ignored';

/** The kinds of alert a user can switch on or off. */
export type TrackerAlertType = 'newTx' | 'categorized' | 'verify' | 'duplicate' | 'revoked' | 'paused' | 'sync';

/** How the money moved; the name shows through the key tracker.method.<code>. */
export type TrackerMethod = 'upi' | 'debitCard' | 'creditCard' | 'card' | 'neft' | 'imps' | 'rtgs' | 'netBanking' | 'atm' | 'bank' | 'cash';

/** Why a transaction is a duplicate (tracker.dup.<code>); echo: a bank's confirmation of a transfer already counted. */
export type TrackerDupReason = 'sameText' | 'sameRef' | 'sameAmount' | 'echo';

/**
 * What a transaction counts towards (tracker.flow.<code>). Spend, card spend and EMI are spending; salary and income are income; a card bill paid leaves the
 * bank but is not spending (the card's purchases already were); refunds lower spending; the card's "payment received", self transfers and money borrowed count nowhere.
 */
export type TrackerFlow = 'spend' | 'cardSpend' | 'emi' | 'cardBillPaid' | 'salary' | 'income' | 'refund' | 'cardRefund' | 'loanIn' | 'selfTransfer' | 'cardPaymentIn';

/** A bank account, credit card or loan of the user. */
export type TrackerAccountType = 'bank' | 'card' | 'loan';

/** The dashboard's period: one month, or a whole year. */
export type TrackerPeriodKind = 'month' | 'year';

/** One step of reading an SMS: where it ran, its name (tracker.step.<key>), whether it passed, and the values of its detail line. */
export interface TrackerStep {
  key: string;
  ok: boolean;
  where: 'phone' | 'server';
  args: Record<string, string | number>;
}

/** What reading one SMS gave: a new transaction, a duplicate, or skipped with a reason (tracker.out.<reason>). */
export interface TrackerSmsResult {
  steps: TrackerStep[];
  reason: string | null;
  txn: TrackerTxn | null;
  outcome: 'created' | 'duplicate' | 'skipped';
}

/** What the SMS backup file held: how many messages, and the received bank and UPI ones to import (oldest first). */
export interface TrackerBackup {
  total: number;
  messages: TrackerImportSms[];
}

/** One received message of an SMS backup, as sent to POST /tracker/sms/import. */
export interface TrackerImportSms {
  body: string;
  sender: string;
  receivedAt: string;
}

/** What one import batch gave (the Add sheet adds the batches up): new transactions, duplicates, ignored messages and ones imported before. */
export interface TrackerImportResult {
  already: number;
  created: number;
  skipped: number;
  duplicates: number;
}

/** The original SMS of a transaction; marks are the parts the reader used (amount, merchant, account, reference). */
export interface TrackerSms {
  body: string;
  sender: string;
  marks: string[];
  receivedAt: string;
  senderName: string;
}

/** One transaction. Amounts are in rupees; the description is built from these fields in the user's language (tracker.desc.*). */
export interface TrackerTxn {
  id: number;
  at: string;
  note: string;
  amount: number;
  edited: boolean;
  category: string;
  createdAt: string;
  flow: TrackerFlow;
  type: TrackerType;
  confidence: number;
  ref: string | null;
  flowEdited: boolean;
  kind: string | null;
  dupOf: number | null;
  typeGuessed: boolean;
  loanId: number | null;
  method: TrackerMethod;
  pairId: number | null;
  source: TrackerSource;
  status: TrackerStatus;
  account: string | null;
  sms: TrackerSms | null;
  merchant: string | null;
  accountId: number | null;
  dupWhy: TrackerDupReason | null;
}

/** An alert in the bell list; its title and line come from tracker.alert.<type> with the transaction's merchant and amount. */
export interface TrackerAlert {
  id: number;
  at: string;
  read: boolean;
  txnId: number | null;
  type: TrackerAlertType;
  args: Record<string, string | number>;
}

/** The user's SnapTracker settings (Settings > General > SnapTracker). */
export interface TrackerSettings {
  push: boolean;
  threshold: number;
  approval: TrackerApproval;
  alerts: Record<TrackerAlertType, boolean>;
}

/** SMS reading on the phone, and since when it is on. */
export interface TrackerTracking {
  since: string | null;
  state: TrackingState;
}

/** How many messages were ignored before anything was read further. */
export interface TrackerFiltered {
  otp: number;
  other: number;
  promo: number;
  failed: number;
  notice: number;
  balance: number;
}

/** Everything the app shows, loaded at once (GET /tracker/state). */
export interface TrackerData {
  txns: TrackerTxn[];
  owner: TrackerOwner;
  alerts: TrackerAlert[];
  filtered: TrackerFiltered;
  settings: TrackerSettings;
  tracking: TrackerTracking;
  accounts: TrackerAccount[];
}

/** How the user appears in an SMS: the names banks write ("Kunal Kumar") and their mobile numbers; money to or from them is a self transfer. */
export interface TrackerOwner {
  names: string[];
  mobiles: string[];
}

/** A bank account, credit card or loan (amounts in rupees): a card's latest statement and due date, a loan's EMI. */
export interface TrackerAccount {
  id: number;
  last4: string;
  provider: string;
  emi: number | null;
  dueOn: string | null;
  label: string | null;
  type: TrackerAccountType;
  statementTotal: number | null;
}

/** The dashboard's period: a month (0-11) of a year, or the whole year. */
export interface TrackerPeriod {
  year: number;
  month: number;
  kind: TrackerPeriodKind;
}

/** The money of a period: income, money out of the bank (spends, EMIs, card bills), what is left, and what was bought (bank and card spends, EMIs). */
export interface TrackerTotals {
  emi: number;
  left: number;
  income: number;
  bankOut: number;
  borrowed: number;
  cardBill: number;
  spending: number;
  bankSpend: number;
  cardSpend: number;
}

/** A category: its code (name tracker.cat.<code>), colour and emoji. */
export interface TrackerCategory {
  code: string;
  color: string;
  emoji: string;
}

/** A transaction typed in by hand, or the edited fields of one. */
export interface TrackerTxnRequest {
  at: string;
  note: string;
  amount: number;
  category: string;
  type: TrackerType;
  method: TrackerMethod;
  merchant: string | null;
}

/** A month of the dashboard's bar chart. */
export interface TrackerMonth {
  key: string;
  spent: number;
  income: number;
}

/** A slice of the "where it went" chart. */
export interface TrackerSlice {
  pct: number;
  code: string;
  color: string;
  emoji: string;
  total: number;
}

/** A day of the Activity list: its label, net amount and transactions. */
export interface TrackerDay {
  net: number;
  label: string;
  items: TrackerTxn[];
}

/** A link of the rail and the bottom tabs. */
export interface TrackerNavItem {
  path: string;
  label: string;
  icon: TrackerIconName;
  query?: Record<string, string>;
}

/** The names of the line icons (tracker-icons.ts), the same drawings as SnapKhata's plus a few of SnapTracker's own. */
export type TrackerIconName = 'home' | 'list' | 'user' | 'plus' | 'search' | 'x' | 'check' | 'alert' | 'bell' | 'settings' | 'shield' | 'trash' | 'edit' | 'download' | 'zap' | 'trend' | 'wallet' | 'chev' | 'info' | 'sms' | 'copies' | 'pause' | 'play' | 'layers' | 'down' | 'up' | 'tag' | 'spark' | 'filter';

/** One shape of a line icon; only the attributes of its tag are set. */
export interface TrackerIconShape {
  d?: string;
  r?: number;
  x?: number;
  y?: number;
  cx?: number;
  cy?: number;
  rx?: number;
  ry?: number;
  width?: number;
  height?: number;
  tag: 'path' | 'circle' | 'rect' | 'ellipse';
}

/** A message of a panel (Settings or Profile part): its text and whether it is an error. */
export interface TrackerNotice {
  text: string;
  error: boolean;
}
