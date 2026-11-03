import { KhataEntrySnapshot, KhataEntryType, KhataContactType, KhataNotify, KhataStorage } from '../models/khata.model';

/** A book of the demo (KhataBooks table). `ownerId` is the account's user id (the API maps it to a KhataUsers row; the demo uses it directly). */
export interface KhataDemoBook {
  id: number;
  name: string;
  ownerId: number;
  createdOn: string;
  currencyId: number;
  deleted?: boolean;
}

/** A money type a user added (KhataCurrencies with an owner); the built-in ones are in KHATA_DEMO_CURRENCIES. */
export interface KhataDemoCurrency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  ownerId: number;
  decimals: number;
  deleted?: boolean;
}

/** A customer or supplier of a book (KhataContacts). `photoFileId` points at the picture in `files`; `photo` is its version for the picture URL. */
export interface KhataDemoContact {
  id: number;
  name: string;
  note?: string;
  bookId: number;
  email?: string;
  mobile?: string;
  address?: string;
  deleted?: boolean;
  createdOn: string;
  rowVersion: string;
  notify: KhataNotify;
  photo: string | null;
  photoFileId?: number;
  allowContactEntries: boolean;
  contactType: KhataContactType;
}

/** One entry (KhataTransactions). Deleted entries stay, marked, as in the API (IsSoftDeleted). */
export interface KhataDemoEntry {
  id: number;
  note?: string;
  bookId: number;
  version: number;
  deleted?: boolean;
  contactId: number;
  createdOn: string;
  entryDate: string;
  rowVersion: string;
  addedById: number;
  amountMinor: number;
  modifiedOn?: string;
  entryType: KhataEntryType;
}

/** One saved version of an entry (KhataTransactionHistory): changeType 1 = created, 2 = edited, 3 = deleted. */
export interface KhataDemoHistory {
  entryId: number;
  version: number;
  changedOn: string;
  changeType: number;
  changedByUserId: number;
  snapshot: KhataEntrySnapshot;
}

/** A bill photo or a party picture, kept as a data: URL in this browser. */
export interface KhataDemoFile {
  id: number;
  data: string;
  ownerId: number;
  entryId?: number;
  fileName: string;
  sizeBytes: number;
  contentType: string;
}

/** SnapKhata's part of the demo database. `lastBook` and `notifications` are per user id; `storage` is for the whole site. */
export interface KhataDemoDb {
  files: KhataDemoFile[];
  books: KhataDemoBook[];
  storage: KhataStorage;
  entries: KhataDemoEntry[];
  history: KhataDemoHistory[];
  contacts: KhataDemoContact[];
  currencies: KhataDemoCurrency[];
  lastBook: Record<number, number>;
  notifications: Record<number, boolean>;
}

/** What one SnapKhata call answers: a message code and its arguments, data, or a file (photos and exports). */
export interface KhataDemoResult {
  code?: string;
  file?: Blob;
  data?: unknown;
  args?: (string | number)[];
}
