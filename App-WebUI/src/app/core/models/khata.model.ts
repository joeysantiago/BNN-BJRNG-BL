/** SnapKhata API shapes (App-WebAPI Thakurg.Contracts/Khata). Amounts are whole smallest units (paise, fils…): `amountMinor`. */

export type KhataEntryType = 1 | 2;

export type KhataContactType = 1 | 2;

export type KhataPinMode = 'set' | 'unlock';

/** PIN-proof purposes, as the API numbers them (KhataPinPurpose). */
export const KHATA_PIN_PURPOSE = { EditTransaction: 1, DeleteTransaction: 2, ChangePin: 3, DeleteContact: 6, AllowContactEntries: 7, DeleteBook: 8 } as const;

export type KhataPinPurpose = (typeof KHATA_PIN_PURPOSE)[keyof typeof KHATA_PIN_PURPOSE];

/** Gave = credit given (the balance goes up: you will get). Got = payment received. */
export const KHATA_GAVE: KhataEntryType = 1;

export const KHATA_GOT: KhataEntryType = 2;

export interface KhataAuthResult {
  hasPin: boolean;
  unlocked: boolean;
  accessToken: string;
  displayName: string;
  storageProvider: number;
  expiresInSeconds: number;
}

export interface KhataPinProof {
  proof: string;
  expiresInSeconds: number;
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
  rowVersion: string;
  amountMinor: number;
  modifiedOn?: string;
  addedByUserId: number;
  entryType: KhataEntryType;
}

export interface KhataEntryRequest {
  note?: string;
  entryDate: string;
  amountMinor: number;
  rowVersion?: string;
  entryType: KhataEntryType;
}

export interface KhataEntryPage {
  page: number;
  total: number;
  pageSize: number;
  items: KhataEntry[];
  balanceMinor: number;
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

/** The add/edit form of the ledger screen: a new entry of this type, or an existing entry being edited. */
export interface KhataEntryForm {
  type: KhataEntryType;
  entry: KhataEntry | null;
}

/** A PIN-proof question shown by the PIN sheet: what it is for, and which item. */
export interface KhataPinRequest {
  title: string;
  targetId?: number;
  purpose: KhataPinPurpose;
}

/** Messages between open SnapKhata tabs, so unlocking, locking and logging out apply to every tab. */
export interface KhataTabMessage {
  token?: string;
  expiresAt?: number;
  type: 'hello' | 'unlocked' | 'locked' | 'logout';
}
