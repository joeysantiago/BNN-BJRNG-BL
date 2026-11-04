/** SnapKhata API shapes (App-WebAPI Thakurg.Contracts/Khata). Amounts are whole smallest units (paise, fils…): `amountMinor`. */

export type KhataEntryType = 1 | 2;

export type KhataContactType = 1 | 2;

/** Gave = credit given (the balance goes up: you will get). Got = payment received. */
export const KHATA_GAVE: KhataEntryType = 1;

export const KHATA_GOT: KhataEntryType = 2;

export const KHATA_CUSTOMER: KhataContactType = 1;

export const KHATA_SUPPLIER: KhataContactType = 2;

/** Which entries a list shows: all, live "you gave" / "you got", live entries with bill photos, or deleted ones. */
export type KhataEntryKind = 'all' | 'gave' | 'got' | 'photos' | 'deleted';

export type KhataEntrySort = 'newest' | 'oldest' | 'high' | 'low';

export type KhataPartySort = 'recent' | 'name' | 'high' | 'low';

export type KhataPartyKind = 'all' | 'customers' | 'suppliers';

export type KhataPartyStatus = 'all' | 'collect' | 'pay' | 'settled';

/** Names of the line icons in khata-icons.ts. */
export type KhataIconName = 'home' | 'users' | 'list' | 'book' | 'user' | 'plus' | 'search' | 'sun' | 'moon' | 'monitor' | 'lock' | 'back' | 'next' | 'chev' | 'chevL' | 'chevD' | 'camera' | 'image' | 'x' | 'trash' | 'edit' | 'history' | 'gave' | 'got' | 'sort' | 'check' | 'alert' | 'phone' | 'mail' | 'settings' | 'logout' | 'wallet' | 'calendar' | 'note' | 'clip' | 'swap' | 'shield' | 'zap' | 'trend' | 'download' | 'globe' | 'store' | 'truck' | 'hash' | 'logo' | 'install' | 'filePdf' | 'fileSheet' | 'fileCsv' | 'palette' | 'chat';

/** One shape of a line icon; only the attributes of its tag are set. */
export interface KhataIconShape {
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

export interface KhataCurrency {
  id: number;
  code: string;
  name: string;
  isIso: boolean;
  symbol: string;
  decimals: number;
  isCustom: boolean;
}

export interface KhataCurrencyRequest {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
}

export interface KhataBook {
  id: number;
  name: string;
  hasEntries: boolean;
  contactCount: number;
  isLastOpened: boolean;
  currency: KhataCurrency;
  youWillGetMinor: number;
  youWillGiveMinor: number;
}

export interface KhataBookRequest {
  name: string;
  currencyId: number;
}

export interface KhataContact {
  id: number;
  name: string;
  note?: string;
  bookId: number;
  email?: string;
  mobile?: string;
  address?: string;
  dueDate?: string;
  rowVersion: string;
  shareStatus: number;
  balanceMinor: number;
  lastEntryOn?: string;
  notify?: KhataNotify;
  /** Version of the contact's profile picture; changes with every upload. Null = none (initials are shown). */
  photo?: string | null;
  allowContactEntries: boolean;
  contactType: KhataContactType;
}

export interface KhataContactRequest {
  name: string;
  note?: string;
  email?: string;
  mobile?: string;
  address?: string;
  rowVersion?: string;
  contactType: KhataContactType;
}

export interface KhataBookContacts {
  book: KhataBook;
  contacts: KhataContact[];
}

export interface KhataEntry {
  id: number;
  note?: string;
  version: number;
  contactId: number;
  createdOn: string;
  entryDate: string;
  addedByMe: boolean;
  isDeleted: boolean;
  photoCount: number;
  rowVersion: string;
  amountMinor: number;
  modifiedOn?: string;
  contactName?: string;
  addedByUserId: number;
  entryType: KhataEntryType;
  balanceAfterMinor?: number | null;
}

export interface KhataEntryRequest {
  note?: string;
  entryDate: string;
  amountMinor: number;
  rowVersion?: string;
  entryType: KhataEntryType;
}

/** One page of a contact's or a book's entries. `gaveMinor` / `gotMinor` add up the live entries that match the filter, on every page. */
export interface KhataEntryPage {
  page: number;
  total: number;
  gotMinor: number;
  pageSize: number;
  gaveMinor: number;
  items: KhataEntry[];
  balanceMinor: number;
}

/** Filters of the entry lists, sent as query parameters. Dates are YYYY-MM-DD; empty values are left out. */
export interface KhataEntryQuery {
  q: string;
  to: string;
  from: string;
  page: number;
  kind: KhataEntryKind;
  sort: KhataEntrySort;
}

export interface KhataEntrySnapshot {
  note?: string;
  entryDate: string;
  amountMinor: number;
  entryType: KhataEntryType;
}

export interface KhataEntryHistory {
  version: number;
  changedOn: string;
  changeType: number;
  changedByUserId: number;
  snapshot: KhataEntrySnapshot;
}

export interface KhataMonth {
  month: string;
  gotMinor: number;
  gaveMinor: number;
  entryCount: number;
}

/** Everything the dashboard of one book shows, in one call. */
export interface KhataBookSummary {
  book: KhataBook;
  entryCount: number;
  toGetCount: number;
  toGiveCount: number;
  months: KhataMonth[];
  recent: KhataEntry[];
  topContacts: KhataContact[];
}

export interface KhataAttachment {
  id: number;
  fileName: string;
  sizeBytes: number;
  contentType: string;
}

export interface KhataEntryDetail {
  bookId: number;
  entry: KhataEntry;
  contact: KhataContact;
  attachments: KhataAttachment[];
}

/** A bill photo in the entry form: a saved attachment (`attachmentId`) or a new, already compressed file waiting to be uploaded. */
export interface KhataPhoto {
  file?: Blob;
  key: string;
  url: string;
  name: string;
  size: number;
  attachmentId?: number;
}

/** A compressed photo on its way to the API. */
export interface KhataUpload {
  blob: Blob;
  name: string;
}

export interface KhataViewerItem {
  name: string;
  url: string | null;
  attachmentId?: number;
}

export interface KhataViewer {
  index: number;
  items: KhataViewerItem[];
}

export interface KhataToast {
  id: number;
  text: string;
}

export interface KhataConfirm {
  title: string;
  resolve: (ok: boolean) => void;
}

/** A link of the side rail and the bottom tab bar. */
export interface KhataNavItem {
  id: string;
  key: string;
  link: string;
  icon: KhataIconName;
}

/** A party on the parties screen with the values it is filtered and sorted by. */
export interface KhataPartyRow {
  balance: number;
  last: string | null;
  contact: KhataContact;
}

/** Entries under one month heading ("March 2026"), newest month first. */
export interface KhataEntryGroup {
  key: string;
  label: string;
  entries: KhataEntry[];
}

/** One month of the money-flow chart, already placed on the drawing (viewBox units). */
export interface KhataChartBar {
  x: number;
  key: string;
  topY: number;
  label: string;
  gotPath: string;
  gotText: string;
  gavePath: string;
  gaveText: string;
  ariaLabel: string;
  longLabel: string;
}

export interface KhataChartTick {
  y: number;
  label: string;
}

/** The money-flow chart: grouped bars of given and received per month on one shared axis. */
export interface KhataChart {
  width: number;
  height: number;
  plotTop: number;
  plotLeft: number;
  plotRight: number;
  groupWidth: number;
  plotHeight: number;
  bars: KhataChartBar[];
  ticks: KhataChartTick[];
}

/** The chart tooltip: the month it describes and where it points, in pixels inside the chart. */
export interface KhataChartTip {
  top: number;
  left: number;
  bar: KhataChartBar;
}

/** A "+12% vs last month" line under a stat; tone up = good, down = bad. */
export interface KhataDelta {
  text: string;
  icon: KhataIconName | null;
  tone: 'up' | 'down' | 'flat';
}

/** A feature card on the public page. */
export interface KhataLandingFeature {
  key: string;
  icon: KhataIconName;
}

/** Which channels tell a party about a new or changed entry. Email needs the party's email, SMS and WhatsApp their mobile number. */
export interface KhataNotify {
  app: boolean;
  sms: boolean;
  email: boolean;
  whatsApp: boolean;
}

export type KhataStorageProvider = 'local' | 'azure';

/**
 * The app lock of the installed app: checking = asking the server, open = unlocked, locked = asks the PIN, create = first PIN after login,
 * change = new PIN from Settings, reset = new PIN after "Forgot PIN?" and a fresh login.
 */
export type KhataLockMode = 'checking' | 'open' | 'locked' | 'create' | 'change' | 'reset';

/** One step of the PIN screen: the PIN to unlock, the current one (to change it), a new one, or the new one again. */
export type KhataPinStep = 'unlock' | 'current' | 'new' | 'confirm';

/**
 * GET api/khata/pin. `canReset`: this login is fresh, so a new PIN can be chosen without the old one. `protected`: the installed app locks
 * this login session on the server; `locked`: it is locked now, so ledger calls are refused until the PIN is entered.
 */
export interface KhataPinStatus {
  length: number;
  hasPin: boolean;
  locked: boolean;
  canReset: boolean;
  protected: boolean;
  lockAfterMinutes: number;
  lockedUntil: string | null;
}

/** PUT api/khata/pin: the new status and the server's message. */
export interface KhataPinSaved {
  message: string;
  status: KhataPinStatus;
}

/** The reader's own SnapKhata settings. */
export interface KhataSettings {
  notificationsEnabled: boolean;
  storage: { provider: KhataStorageProvider };
}

/** Where bill photos are kept, for the whole site. Only a super admin logged in with a password sees and changes it; the key is never sent back. */
export interface KhataStorage {
  hasKey: boolean;
  enabled: boolean;
  accountName: string;
  containerName: string;
  provider: KhataStorageProvider;
}

export interface KhataStorageRequest {
  enabled: boolean;
  accountName: string;
  containerName: string;
  connectionString?: string;
  provider: KhataStorageProvider;
}

export type KhataExportFormat = 'pdf' | 'xlsx' | 'csv';

/** A tab of the SnapKhata settings screen. */
export type KhataSettingsTab = 'general' | 'notifications' | 'storage' | 'mail' | 'users';

/** A menu of the SnapKhata top bar. */
export type KhataMenu = 'lang' | 'theme' | 'book';

/** Which form of the SnapKhata profile is saving. */
export type KhataProfileForm = 'photo' | 'details' | 'address' | 'password' | 'delete';

/** The result line under a form: the server's message, or its error. */
export interface KhataNotice {
  text: string;
  error: boolean;
}

/** The date picker: one day, or a from–to range. */
export type KhataDateMode = 'single' | 'range';

/** What the date picker's calendar shows: the days of a month, the months of a year, or a page of years. */
export type KhataDateView = 'days' | 'months' | 'years';

/** A ready-made range of the date picker. */
export type KhataDatePreset = 'all' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'thisYear';

/** A from–to range as YYYY-MM-DD; an empty side is open. */
export interface KhataDateRange {
  to: string;
  from: string;
}

/** One day of the date picker's month grid. */
export interface KhataDateCell {
  day: number;
  iso: string;
  end: boolean;
  label: string;
  start: boolean;
  today: boolean;
  inRange: boolean;
  outside: boolean;
  disabled: boolean;
  selected: boolean;
}

/** One month or year of the date picker's month and year views. */
export interface KhataPickCell {
  key: string;
  label: string;
  current: boolean;
  disabled: boolean;
  selected: boolean;
}

/** The text of the date picker's button: the date(s), and a small line under it such as "Yesterday" or "Last 7 days". */
export interface KhataDateDisplay {
  sub: string;
  main: string;
}

/** A one-tap day of the single date picker ("Today", "Yesterday"): how many days back. */
export interface KhataDateQuick {
  key: string;
  days: number;
}

/** Which users the Settings > Users tab lists (GET /admin/users?status=). */
export type KhataUserStatus = 'all' | 'active' | 'archived' | 'deleted';

/** What a mail server profile of Settings > Mail sends: one-time sign-in codes, or SnapKhata notifications. */
export type KhataMailPurpose = 'otp' | 'notification';

/** How the connection to the mail server is secured: STARTTLS (port 587), SSL/TLS from the start (port 465) or none. */
export type KhataMailSecurity = 'starttls' | 'ssl' | 'none';

/** A mail server profile (GET /admin/mail). The password is never sent back: hasPassword says one is saved. */
export interface KhataMailSetting {
  host: string;
  port: number;
  enabled: boolean;
  fromName: string;
  userName: string;
  fromAddress: string;
  hasPassword: boolean;
  purpose: KhataMailPurpose;
  security: KhataMailSecurity;
}
