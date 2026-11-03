import { DemoFailure } from './demo-failure';
import { randomToken } from './demo-hash';
import { DemoDb, DemoUser } from './demo.model';
import { KHATA_DEMO_MESSAGES } from './khata-demo-messages';
import { KhataDemoBook, KhataDemoContact, KhataDemoDb, KhataDemoEntry, KhataDemoFile, KhataDemoResult } from './khata-demo.model';
import { KHATA_GAVE, KhataAttachment, KhataBook, KhataContact, KhataCurrency, KhataEntry, KhataEntryKind, KhataEntrySnapshot, KhataEntrySort, KhataNotify, KhataStorage } from '../models/khata.model';

export { KHATA_DEMO_MESSAGES };

/** The same values as Khata:Limits in appsettings.json of the API. `fileSpace` is the demo's own: how much of this browser's storage photos may take. */
const LIMITS = { maxBooks: 20, maxCurrencies: 20, maxContacts: 5000, maxAmountMinor: 100000000000000, pageSize: 50, summaryMonths: 6, summaryTop: 5, summaryRecent: 6, maxPhotos: 3, maxPhotoBytes: 2097152, maxContactPhotoBytes: 524288, noteLength: 500, bookNameLength: 100, contactNameLength: 100, addressLength: 300, firstEntryDate: '2000-01-01', maxExportRows: 5000, fileSpace: 3500000 };
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const CONTACT_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const KINDS: KhataEntryKind[] = ['all', 'gave', 'got', 'photos', 'deleted'];
const SORTS: KhataEntrySort[] = ['newest', 'oldest', 'high', 'low'];
const MOBILE = /^\+?[\d\s-]{7,16}$/;
const EMAIL = /^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const ACCOUNT = /^[a-z0-9]{3,24}$/;
const CONTAINER = /^(?=.{3,63}$)[a-z0-9]+(-[a-z0-9]+)*$/;

/** The built-in money types (INSERT/SnapKhata/002_KhataCurrencies.sql), in the same order. */
export const KHATA_DEMO_CURRENCIES: KhataCurrency[] = [
  ['INR', '₹', 'Indian rupee', 2], ['AED', 'د.إ', 'UAE dirham', 2], ['SAR', '﷼', 'Saudi riyal', 2], ['USD', '$', 'US dollar', 2], ['EUR', '€', 'Euro', 2], ['GBP', '£', 'British pound', 2], ['KWD', 'د.ك', 'Kuwaiti dinar', 3],
  ['OMR', 'ر.ع.', 'Omani rial', 3], ['BHD', '.د.ب', 'Bahraini dinar', 3], ['QAR', 'ر.ق', 'Qatari riyal', 2], ['NPR', 'रु', 'Nepalese rupee', 2], ['PKR', '₨', 'Pakistani rupee', 2], ['BDT', '৳', 'Bangladeshi taka', 2],
].map(([code, symbol, name, decimals], i) => ({ id: i + 1, code: String(code), name: String(name), isIso: true, symbol: String(symbol), decimals: Number(decimals), isCustom: false }));

/**
 * SnapKhata's API (KhataBooksController, KhataContactsController, KhataTransactionsController and the rest) inside the browser, for the Angular-only Mojito demo.
 * It follows the rules of the API's Khata services and answers with the same codes. Its data is part of the demo database (DemoDb.khata), so it is kept in this
 * browser's storage with the rest. Loaded with the first SnapKhata call only. PDF and Excel exports and Azure storage need the API; the demo says so.
 */
export class KhataDemo {
  private readonly k: KhataDemoDb;

  constructor(db: DemoDb, private readonly user: DemoUser, private readonly next: () => number, private readonly text: (code: string, args?: (string | number)[]) => string) {
    db.khata ??= { files: [], books: [], storage: { hasKey: false, enabled: false, accountName: '', containerName: '', provider: 'local' }, entries: [], history: [], contacts: [], currencies: [], lastBook: {}, notifications: {} };
    this.k = db.khata;
  }

  // #region Public Methods

  async route(method: string, path: string, query: string, body: unknown, isSuper: boolean): Promise<KhataDemoResult> {
    const id = Number(/\/(\d+)(?:\/|$)/.exec(path)?.[1]);
    const params = new URLSearchParams(query);
    const form = body as Record<string, unknown>;
    switch (`${method} ${path.replace(/\/\d+(?=\/|$)/g, '/{id}')}`) {
      case 'GET /khata/books':
        return { data: this.myBooks().map((b) => this.bookDto(b)) };
      case 'POST /khata/books':
        return { data: this.createBook(form) };
      case 'PUT /khata/books/{id}':
        return { data: this.updateBook(id, form) };
      case 'DELETE /khata/books/{id}':
        return this.deleteBook(id);
      case 'PUT /khata/books/{id}/open':
        this.k.lastBook[this.user.id] = this.book(id).id;
        return { data: this.bookDto(this.book(id)) };
      case 'GET /khata/books/{id}/summary':
        return { data: this.summary(id, params.get('today') ?? '') };
      case 'GET /khata/books/{id}/contacts':
        return { data: { book: this.bookDto(this.book(id)), contacts: this.contactsOf(id).map((c) => this.contactDto(c)) } };
      case 'POST /khata/books/{id}/contacts':
        return { data: this.createContact(id, form) };
      case 'GET /khata/books/{id}/transactions':
        return { data: this.page(this.book(id), null, params) };
      case 'GET /khata/books/{id}/transactions/export':
        return this.exportEntries(this.book(id), null, params);
      case 'GET /khata/books/{id}/contacts/export':
        return this.exportParties(this.book(id), params);
      case 'GET /khata/contacts/{id}/transactions':
        return { data: this.page(this.bookOf(this.contact(id)), this.contact(id), params) };
      case 'GET /khata/contacts/{id}/transactions/export':
        return this.exportEntries(this.bookOf(this.contact(id)), this.contact(id), params);
      case 'POST /khata/contacts/{id}/transactions':
        return { data: this.addEntry(id, form) };
      case 'PUT /khata/contacts/{id}':
        return { data: this.updateContact(id, form) };
      case 'DELETE /khata/contacts/{id}':
        this.contact(id).deleted = true;
        return { code: 'KHATA_CONTACT_DELETED' };
      case 'PUT /khata/contacts/{id}/permissions':
        this.contact(id).allowContactEntries = !!form['allowContactEntries'];
        return { data: this.contactDto(this.contact(id)) };
      case 'GET /khata/contacts/{id}/notifications':
        return { data: this.contact(id).notify };
      case 'PUT /khata/contacts/{id}/notifications':
        return this.setNotify(id, form);
      case 'GET /khata/contacts/{id}/photo':
        return { file: this.blob(this.contactPhoto(id)) };
      case 'PUT /khata/contacts/{id}/photo':
        return this.setContactPhoto(id, body);
      case 'DELETE /khata/contacts/{id}/photo':
        return this.deleteContactPhoto(id);
      case 'GET /khata/transactions/{id}':
        return { data: this.detail(id) };
      case 'PUT /khata/transactions/{id}':
        return { data: this.updateEntry(id, form) };
      case 'DELETE /khata/transactions/{id}':
        return this.deleteEntry(id);
      case 'GET /khata/transactions/{id}/history':
        this.entry(id);
        return { data: this.k.history.filter((h) => h.entryId === id).sort((a, b) => a.version - b.version) };
      case 'POST /khata/transactions/{id}/attachments':
        return { data: await this.uploadPhotos(id, body) };
      case 'GET /khata/attachments/{id}':
        return { file: this.blob(this.attachment(id)) };
      case 'DELETE /khata/attachments/{id}':
        this.k.files = this.k.files.filter((f) => f.id !== this.attachment(id).id);
        return { code: 'KHATA_ATTACHMENT_DELETED' };
      case 'GET /khata/currencies':
        return { data: this.currencies() };
      case 'POST /khata/currencies':
        return { data: this.addCurrency(form) };
      case 'DELETE /khata/currencies/{id}':
        return this.deleteCurrency(id);
      case 'GET /khata/settings':
        return { data: { notificationsEnabled: this.k.notifications[this.user.id] ?? true, storage: { provider: this.k.storage.provider } } };
      case 'PUT /khata/settings':
        this.k.notifications[this.user.id] = !!form['notificationsEnabled'];
        return { code: 'KHATA_SETTINGS_SAVED' };
      case 'GET /khata/storage':
        this.requireSuper(isSuper);
        return { data: this.k.storage };
      case 'PUT /khata/storage':
        this.requireSuper(isSuper);
        return this.saveStorage(form);
      case 'POST /khata/storage/test':
        this.requireSuper(isSuper);
        if (this.k.storage.provider !== 'azure' || !this.k.storage.hasKey || !this.k.storage.containerName)
          throw new DemoFailure(400, 'KHATA_STORAGE_UNREACHABLE');
        return { code: 'KHATA_DEMO_STORAGE' };
      default:
        throw new DemoFailure(404, 'UNEXPECTED_ERROR');
    }
  }

  // #endregion

  // #region Private Methods

  private now(): string {
    return new Date().toISOString();
  }

  /** The browser's own date, as YYYY-MM-DD. */
  private today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private requireSuper(isSuper: boolean): void {
    if (!isSuper)
      throw new DemoFailure(403, 'AUTH_FORBIDDEN');
  }

  private myBooks(): KhataDemoBook[] {
    return this.k.books.filter((b) => b.ownerId === this.user.id && !b.deleted);
  }

  private book(bookId: number): KhataDemoBook {
    const book = this.myBooks().find((b) => b.id === bookId);
    if (!book)
      throw new DemoFailure(404, 'KHATA_BOOK_NOT_FOUND');
    return book;
  }

  private bookOf(contact: KhataDemoContact): KhataDemoBook {
    return this.book(contact.bookId);
  }

  private contactsOf(bookId: number): KhataDemoContact[] {
    return this.k.contacts.filter((c) => c.bookId === bookId && !c.deleted);
  }

  /** A live contact of one of the caller's books. */
  private contact(contactId: number): KhataDemoContact {
    const contact = this.k.contacts.find((c) => c.id === contactId && !c.deleted);
    if (!contact || !this.myBooks().some((b) => b.id === contact.bookId))
      throw new DemoFailure(404, 'KHATA_CONTACT_NOT_FOUND');
    return contact;
  }

  /** An entry (live or deleted) of one of the caller's books. */
  private entry(entryId: number): KhataDemoEntry {
    const entry = this.k.entries.find((e) => e.id === entryId);
    if (!entry || !this.myBooks().some((b) => b.id === entry.bookId))
      throw new DemoFailure(404, 'KHATA_ENTRY_NOT_FOUND');
    return entry;
  }

  private liveEntries(filter: (e: KhataDemoEntry) => boolean): KhataDemoEntry[] {
    return this.k.entries.filter((e) => !e.deleted && filter(e));
  }

  private signed(entry: KhataDemoEntry): number {
    return entry.entryType === KHATA_GAVE ? entry.amountMinor : -entry.amountMinor;
  }

  /** What the party owes (above 0: you will get) from their live entries. */
  private balance(contactId: number): number {
    return this.liveEntries((e) => e.contactId === contactId).reduce((sum, e) => sum + this.signed(e), 0);
  }

  private currency(currencyId: number): KhataCurrency | null {
    return this.currencies().find((c) => c.id === currencyId) ?? null;
  }

  /** The built-in money types, then the caller's own. */
  private currencies(): KhataCurrency[] {
    const own = this.k.currencies.filter((c) => c.ownerId === this.user.id && !c.deleted).map((c) => ({ id: c.id, code: c.code, name: c.name, isIso: false, symbol: c.symbol, decimals: c.decimals, isCustom: true }));
    return [...KHATA_DEMO_CURRENCIES, ...own];
  }

  private bookDto(book: KhataDemoBook): KhataBook {
    const balances = this.contactsOf(book.id).map((c) => this.balance(c.id));
    return {
      id: book.id,
      name: book.name,
      hasEntries: this.liveEntries((e) => e.bookId === book.id).length > 0,
      contactCount: balances.length,
      isLastOpened: this.k.lastBook[this.user.id] === book.id,
      currency: this.currency(book.currencyId) ?? KHATA_DEMO_CURRENCIES[0],
      youWillGetMinor: balances.filter((b) => b > 0).reduce((s, b) => s + b, 0),
      youWillGiveMinor: balances.filter((b) => b < 0).reduce((s, b) => s - b, 0),
    };
  }

  private contactDto(contact: KhataDemoContact): KhataContact {
    const last = this.liveEntries((e) => e.contactId === contact.id).map((e) => e.entryDate).sort().pop();
    return { id: contact.id, name: contact.name, note: contact.note, bookId: contact.bookId, email: contact.email, mobile: contact.mobile, address: contact.address, rowVersion: contact.rowVersion, shareStatus: 0, balanceMinor: this.balance(contact.id), lastEntryOn: last, notify: contact.notify, photo: contact.photo, allowContactEntries: contact.allowContactEntries, contactType: contact.contactType };
  }

  /** The entry as the lists show it: the party's name, the photo count and the running balance (the party's live entries up to this one, by date then id). */
  private entryDto(entry: KhataDemoEntry): KhataEntry {
    const upTo = (e: KhataDemoEntry) => e.contactId === entry.contactId && (e.entryDate < entry.entryDate || (e.entryDate === entry.entryDate && e.id <= entry.id));
    return {
      id: entry.id,
      note: entry.note,
      version: entry.version,
      contactId: entry.contactId,
      createdOn: entry.createdOn,
      entryDate: entry.entryDate,
      addedByMe: entry.addedById === this.user.id,
      isDeleted: !!entry.deleted,
      photoCount: this.k.files.filter((f) => f.entryId === entry.id).length,
      rowVersion: entry.rowVersion,
      amountMinor: entry.amountMinor,
      modifiedOn: entry.modifiedOn,
      contactName: this.k.contacts.find((c) => c.id === entry.contactId)?.name,
      addedByUserId: entry.addedById,
      entryType: entry.entryType,
      balanceAfterMinor: entry.deleted ? null : this.liveEntries(upTo).reduce((s, e) => s + this.signed(e), 0),
    };
  }

  private attachments(entryId: number): KhataAttachment[] {
    return this.k.files.filter((f) => f.entryId === entryId).map((f) => ({ id: f.id, fileName: f.fileName, sizeBytes: f.sizeBytes, contentType: f.contentType }));
  }

  private snapshot(entry: KhataDemoEntry): KhataEntrySnapshot {
    return { note: entry.note, entryDate: entry.entryDate, amountMinor: entry.amountMinor, entryType: entry.entryType };
  }

  /** Records a version of the entry (1 = created, 2 = edited, 3 = deleted). */
  private remember(entry: KhataDemoEntry, changeType: number): void {
    this.k.history.push({ entryId: entry.id, version: entry.version, changedOn: this.now(), changeType, changedByUserId: this.user.id, snapshot: this.snapshot(entry) });
  }

  private optional(value: unknown): string | undefined {
    const text = String(value ?? '').trim();
    return text || undefined;
  }

  private bookName(value: unknown, exceptId: number): string {
    const name = String(value ?? '').trim();
    if (!name || name.length > LIMITS.bookNameLength)
      throw new DemoFailure(400, 'KHATA_BOOK_NAME_INVALID', [LIMITS.bookNameLength]);
    if (this.myBooks().some((b) => b.id !== exceptId && b.name.toLowerCase() === name.toLowerCase()))
      throw new DemoFailure(409, 'KHATA_BOOK_NAME_TAKEN');
    return name;
  }

  private createBook(form: Record<string, unknown>): KhataBook {
    if (this.myBooks().length >= LIMITS.maxBooks)
      throw new DemoFailure(409, 'KHATA_BOOK_LIMIT', [LIMITS.maxBooks]);
    const name = this.bookName(form['name'], 0);
    const currency = this.currency(Number(form['currencyId']));
    if (!currency)
      throw new DemoFailure(404, 'KHATA_CURRENCY_NOT_FOUND');
    const book: KhataDemoBook = { id: this.next(), name, ownerId: this.user.id, createdOn: this.now(), currencyId: currency.id };
    this.k.books.push(book);
    return this.bookDto(book);
  }

  /** The money type is fixed once the book has a live entry. */
  private updateBook(bookId: number, form: Record<string, unknown>): KhataBook {
    const book = this.book(bookId);
    const name = this.bookName(form['name'], book.id);
    const currency = this.currency(Number(form['currencyId']));
    if (!currency)
      throw new DemoFailure(404, 'KHATA_CURRENCY_NOT_FOUND');
    if (currency.id !== book.currencyId && this.bookDto(book).hasEntries)
      throw new DemoFailure(409, 'KHATA_BOOK_CURRENCY_LOCKED');
    book.name = name;
    book.currencyId = currency.id;
    return this.bookDto(book);
  }

  private deleteBook(bookId: number): KhataDemoResult {
    this.book(bookId).deleted = true;
    if (this.k.lastBook[this.user.id] === bookId)
      delete this.k.lastBook[this.user.id];
    return { code: 'KHATA_BOOK_DELETED' };
  }

  /** The dashboard: totals, counts, the last months up to the reader's month, the largest open balances and the newest entries. */
  private summary(bookId: number, today: string): unknown {
    const book = this.book(bookId);
    const contacts = this.contactsOf(book.id).map((c) => this.contactDto(c));
    const live = this.liveEntries((e) => e.bookId === book.id);
    const end = DAY.test(today) ? today : this.today();
    const months = Array.from({ length: LIMITS.summaryMonths }, (_, i) => {
      const d = new Date(Date.UTC(Number(end.slice(0, 4)), Number(end.slice(5, 7)) - 1 - (LIMITS.summaryMonths - 1 - i), 1));
      const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      const inMonth = live.filter((e) => e.entryDate.startsWith(month));
      return { month, gotMinor: inMonth.filter((e) => e.entryType !== KHATA_GAVE).reduce((s, e) => s + e.amountMinor, 0), gaveMinor: inMonth.filter((e) => e.entryType === KHATA_GAVE).reduce((s, e) => s + e.amountMinor, 0), entryCount: inMonth.length };
    });
    const recent = [...live].sort((a, b) => b.entryDate.localeCompare(a.entryDate) || b.id - a.id).slice(0, LIMITS.summaryRecent).map((e) => this.entryDto(e));
    const top = contacts.filter((c) => c.balanceMinor !== 0).sort((a, b) => Math.abs(b.balanceMinor) - Math.abs(a.balanceMinor)).slice(0, LIMITS.summaryTop);
    return { book: this.bookDto(book), entryCount: live.length, toGetCount: contacts.filter((c) => c.balanceMinor > 0).length, toGiveCount: contacts.filter((c) => c.balanceMinor < 0).length, months, recent, topContacts: top };
  }

  /** Name 1 to 100 characters; mobile number and e-mail optional but valid when given. */
  private contactFields(form: Record<string, unknown>): Pick<KhataDemoContact, 'name' | 'note' | 'email' | 'mobile' | 'address' | 'contactType'> {
    const name = String(form['name'] ?? '').trim();
    const mobile = this.optional(form['mobile']);
    const email = this.optional(form['email'])?.toLowerCase();
    const address = this.optional(form['address']);
    if (!name || name.length > LIMITS.contactNameLength || (mobile && !MOBILE.test(mobile)) || (email && !EMAIL.test(email)) || (address?.length ?? 0) > LIMITS.addressLength)
      throw new DemoFailure(400, 'KHATA_CONTACT_INVALID', [LIMITS.contactNameLength]);
    return { name, note: this.optional(form['note']), email, mobile, address, contactType: Number(form['contactType']) === 2 ? 2 : 1 };
  }

  private createContact(bookId: number, form: Record<string, unknown>): KhataContact {
    const book = this.book(bookId);
    if (this.contactsOf(book.id).length >= LIMITS.maxContacts)
      throw new DemoFailure(409, 'KHATA_CONTACT_LIMIT', [LIMITS.maxContacts]);
    const contact: KhataDemoContact = { id: this.next(), bookId: book.id, createdOn: this.now(), rowVersion: randomToken(), notify: { app: false, sms: false, email: false }, photo: null, allowContactEntries: false, ...this.contactFields(form) };
    this.k.contacts.push(contact);
    return this.contactDto(contact);
  }

  /** The row version sent back must be the one saved, or someone else changed it in between. */
  private updateContact(contactId: number, form: Record<string, unknown>): KhataContact {
    const contact = this.contact(contactId);
    if (form['rowVersion'] && form['rowVersion'] !== contact.rowVersion)
      throw new DemoFailure(409, 'KHATA_CHANGED_ELSEWHERE');
    Object.assign(contact, this.contactFields(form), { rowVersion: randomToken() });
    return this.contactDto(contact);
  }

  /** E-mail needs the party's e-mail address, SMS their mobile number. */
  private setNotify(contactId: number, form: Record<string, unknown>): KhataDemoResult {
    const contact = this.contact(contactId);
    const notify: KhataNotify = { app: !!form['app'], sms: !!form['sms'], email: !!form['email'] };
    if (notify.email && !contact.email)
      throw new DemoFailure(400, 'KHATA_NOTIFY_EMAIL_MISSING');
    if (notify.sms && !contact.mobile)
      throw new DemoFailure(400, 'KHATA_NOTIFY_MOBILE_MISSING');
    contact.notify = notify;
    return { code: 'KHATA_NOTIFY_SAVED', data: notify };
  }

  /** Type 1 or 2, a whole amount above 0, a date from 2000-01-01 to today, a note of up to 500 characters. */
  private entryFields(form: Record<string, unknown>): Pick<KhataDemoEntry, 'note' | 'entryDate' | 'amountMinor' | 'entryType'> {
    const amount = Number(form['amountMinor']);
    const date = String(form['entryDate'] ?? '');
    const note = this.optional(form['note']);
    const type = Number(form['entryType']);
    const latest = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    if ((type !== 1 && type !== 2) || !Number.isSafeInteger(amount) || amount <= 0 || amount > LIMITS.maxAmountMinor || !DAY.test(date) || date < LIMITS.firstEntryDate || date > latest || (note?.length ?? 0) > LIMITS.noteLength)
      throw new DemoFailure(400, 'KHATA_ENTRY_INVALID', [LIMITS.noteLength]);
    return { note, entryDate: date, amountMinor: amount, entryType: type as 1 | 2 };
  }

  private addEntry(contactId: number, form: Record<string, unknown>): KhataEntry {
    const contact = this.contact(contactId);
    const now = this.now();
    const entry: KhataDemoEntry = { id: this.next(), bookId: contact.bookId, version: 1, contactId: contact.id, createdOn: now, rowVersion: randomToken(), addedById: this.user.id, ...this.entryFields(form) };
    this.k.entries.push(entry);
    this.remember(entry, 1);
    return this.entryDto(entry);
  }

  /** Only the one who added an entry may change it, and only a live one with the row version they saw. */
  private editable(entryId: number, rowVersion: unknown): KhataDemoEntry {
    const entry = this.entry(entryId);
    if (entry.deleted)
      throw new DemoFailure(404, 'KHATA_ENTRY_NOT_FOUND');
    if (entry.addedById !== this.user.id)
      throw new DemoFailure(403, 'KHATA_ENTRY_NOT_YOURS');
    if (rowVersion && rowVersion !== entry.rowVersion)
      throw new DemoFailure(409, 'KHATA_CHANGED_ELSEWHERE');
    return entry;
  }

  private updateEntry(entryId: number, form: Record<string, unknown>): KhataEntry {
    const entry = this.editable(entryId, form['rowVersion']);
    Object.assign(entry, this.entryFields(form), { version: entry.version + 1, rowVersion: randomToken(), modifiedOn: this.now() });
    this.remember(entry, 2);
    return this.entryDto(entry);
  }

  /** A soft delete: the entry stays, marked deleted, with its history. */
  private deleteEntry(entryId: number): KhataDemoResult {
    const entry = this.editable(entryId, null);
    Object.assign(entry, { deleted: true, version: entry.version + 1, rowVersion: randomToken(), modifiedOn: this.now() });
    this.remember(entry, 3);
    return { code: 'KHATA_ENTRY_DELETED' };
  }

  private detail(entryId: number): unknown {
    const entry = this.entry(entryId);
    const contact = this.k.contacts.find((c) => c.id === entry.contactId)!;
    return { bookId: entry.bookId, entry: this.entryDto(entry), contact: this.contactDto(contact), attachments: this.attachments(entry.id) };
  }

  /** The entries of a book (contact = null, the search also matches party names) or of one party, filtered, sorted and cut into pages of 50. */
  private filtered(book: KhataDemoBook, contact: KhataDemoContact | null, params: URLSearchParams): KhataDemoEntry[] {
    const kind = (params.get('kind') ?? 'all') as KhataEntryKind;
    const sort = (params.get('sort') ?? 'newest') as KhataEntrySort;
    const from = params.get('from') ?? '';
    const to = params.get('to') ?? '';
    const q = (params.get('q') ?? '').trim().toLowerCase();
    if (!KINDS.includes(kind) || !SORTS.includes(sort) || (from && !DAY.test(from)) || (to && !DAY.test(to)))
      throw new DemoFailure(400, 'KHATA_QUERY_INVALID');
    const names = new Map(this.k.contacts.map((c) => [c.id, c.name.toLowerCase()]));
    const photos = new Set(this.k.files.filter((f) => f.entryId).map((f) => f.entryId));
    const kinds: Record<KhataEntryKind, (e: KhataDemoEntry) => boolean> = {
      all: (e) => !e.deleted,
      gave: (e) => !e.deleted && e.entryType === KHATA_GAVE,
      got: (e) => !e.deleted && e.entryType !== KHATA_GAVE,
      photos: (e) => !e.deleted && photos.has(e.id),
      deleted: (e) => !!e.deleted,
    };
    const live = new Set(this.contactsOf(book.id).map((c) => c.id));
    const rows = this.k.entries.filter((e) => e.bookId === book.id && (contact ? e.contactId === contact.id : live.has(e.contactId)) && kinds[kind](e) && (!from || e.entryDate >= from) && (!to || e.entryDate <= to)
      && (!q || (e.note ?? '').toLowerCase().includes(q) || (!contact && (names.get(e.contactId) ?? '').includes(q))));
    const byDate = (a: KhataDemoEntry, b: KhataDemoEntry) => b.entryDate.localeCompare(a.entryDate) || b.id - a.id;
    const sorters: Record<KhataEntrySort, (a: KhataDemoEntry, b: KhataDemoEntry) => number> = {
      newest: byDate,
      oldest: (a, b) => -byDate(a, b),
      high: (a, b) => b.amountMinor - a.amountMinor || byDate(a, b),
      low: (a, b) => a.amountMinor - b.amountMinor || byDate(a, b),
    };
    return rows.sort(sorters[sort]);
  }

  private page(book: KhataDemoBook, contact: KhataDemoContact | null, params: URLSearchParams): unknown {
    const rows = this.filtered(book, contact, params);
    const page = Number(params.get('page') ?? '1');
    if (!Number.isInteger(page) || page < 1)
      throw new DemoFailure(400, 'KHATA_QUERY_INVALID');
    const live = rows.filter((e) => !e.deleted);
    const balance = contact ? this.balance(contact.id) : this.contactsOf(book.id).reduce((s, c) => s + this.balance(c.id), 0);
    return {
      page,
      total: rows.length,
      gotMinor: live.filter((e) => e.entryType !== KHATA_GAVE).reduce((s, e) => s + e.amountMinor, 0),
      pageSize: LIMITS.pageSize,
      gaveMinor: live.filter((e) => e.entryType === KHATA_GAVE).reduce((s, e) => s + e.amountMinor, 0),
      items: rows.slice((page - 1) * LIMITS.pageSize, page * LIMITS.pageSize).map((e) => this.entryDto(e)),
      balanceMinor: balance,
    };
  }

  /** The picked files of a multipart form, as the API reads them. */
  private files(body: unknown, name: string): File[] {
    return body instanceof FormData ? body.getAll(name).filter((f): f is File => f instanceof File) : [];
  }

  /** The file as a data: URL, so it can live in this browser's storage. */
  private async dataUrl(file: Blob): Promise<string> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
    return `data:${file.type || 'application/octet-stream'};base64,${btoa(binary)}`;
  }

  private blob(file: KhataDemoFile): Blob {
    const binary = atob(file.data.slice(file.data.indexOf(',') + 1));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: file.contentType });
  }

  /** Photos share this browser's storage with everything else: past this much, the demo asks to delete some first. */
  private checkSpace(adding: number): void {
    const used = this.k.files.reduce((s, f) => s + f.data.length, 0);
    if (used + adding > LIMITS.fileSpace)
      throw new DemoFailure(507, 'KHATA_DEMO_FULL');
  }

  /** JPG, PNG, WebP or GIF up to 2 MB each, at most 3 per entry (with the ones it has). The answer is every photo the entry has now. */
  private async uploadPhotos(entryId: number, body: unknown): Promise<KhataAttachment[]> {
    const entry = this.editable(entryId, null);
    const files = this.files(body, 'files');
    if (!files.length || files.some((f) => !PHOTO_TYPES.includes(f.type) || f.size <= 0 || f.size > LIMITS.maxPhotoBytes))
      throw new DemoFailure(400, 'KHATA_PHOTO_INVALID', [Math.floor(LIMITS.maxPhotoBytes / 1048576)]);
    if (this.attachments(entry.id).length + files.length > LIMITS.maxPhotos)
      throw new DemoFailure(409, 'KHATA_PHOTO_LIMIT', [LIMITS.maxPhotos]);
    const data = await Promise.all(files.map((f) => this.dataUrl(f)));
    this.checkSpace(data.reduce((s, d) => s + d.length, 0));
    files.forEach((f, i) => this.k.files.push({ id: this.next(), data: data[i], ownerId: this.user.id, entryId: entry.id, fileName: f.name, sizeBytes: f.size, contentType: f.type }));
    return this.attachments(entry.id);
  }

  private attachment(attachmentId: number): KhataDemoFile {
    const file = this.k.files.find((f) => f.id === attachmentId && f.entryId);
    if (!file || !this.myBooks().some((b) => b.id === this.k.entries.find((e) => e.id === file.entryId)?.bookId))
      throw new DemoFailure(404, 'KHATA_ATTACHMENT_NOT_FOUND');
    return file;
  }

  private contactPhoto(contactId: number): KhataDemoFile {
    const file = this.k.files.find((f) => f.id === this.contact(contactId).photoFileId);
    if (!file)
      throw new DemoFailure(404, 'KHATA_CONTACT_PHOTO_NOT_FOUND');
    return file;
  }

  /** JPG, PNG or WebP up to 512 KB (already made small in the browser). A new picture gets a new version, so its address changes. */
  private async setContactPhoto(contactId: number, body: unknown): Promise<KhataDemoResult> {
    const contact = this.contact(contactId);
    const file = this.files(body, 'file')[0];
    if (!file || !CONTACT_PHOTO_TYPES.includes(file.type) || file.size <= 0 || file.size > LIMITS.maxContactPhotoBytes)
      throw new DemoFailure(400, 'KHATA_CONTACT_PHOTO_INVALID', [LIMITS.maxContactPhotoBytes / 1024]);
    const data = await this.dataUrl(file);
    this.k.files = this.k.files.filter((f) => f.id !== contact.photoFileId);
    this.checkSpace(data.length);
    const saved: KhataDemoFile = { id: this.next(), data, ownerId: this.user.id, fileName: file.name, sizeBytes: file.size, contentType: file.type };
    this.k.files.push(saved);
    Object.assign(contact, { photoFileId: saved.id, photo: randomToken().slice(0, 12), rowVersion: randomToken() });
    return { code: 'KHATA_CONTACT_PHOTO_SAVED', data: this.contactDto(contact) };
  }

  private deleteContactPhoto(contactId: number): KhataDemoResult {
    const contact = this.contact(contactId);
    if (!contact.photoFileId)
      throw new DemoFailure(404, 'KHATA_CONTACT_PHOTO_NOT_FOUND');
    this.k.files = this.k.files.filter((f) => f.id !== contact.photoFileId);
    Object.assign(contact, { photoFileId: undefined, photo: null, rowVersion: randomToken() });
    return { code: 'KHATA_CONTACT_PHOTO_DELETED' };
  }

  /** A code and a symbol of up to 10 characters, a name of up to 50, 0 to 3 decimals; the code is new among the built-in and own types. */
  private addCurrency(form: Record<string, unknown>): KhataCurrency {
    const code = String(form['code'] ?? '').trim().toUpperCase();
    const symbol = String(form['symbol'] ?? '').trim();
    const name = String(form['name'] ?? '').trim();
    const decimals = Number(form['decimals']);
    if (!code || code.length > 10 || !symbol || symbol.length > 10 || !name || name.length > 50 || !Number.isInteger(decimals) || decimals < 0 || decimals > 3)
      throw new DemoFailure(400, 'KHATA_CURRENCY_INVALID');
    if (this.currencies().some((c) => c.code.toUpperCase() === code))
      throw new DemoFailure(409, 'KHATA_CURRENCY_CODE_TAKEN');
    if (this.currencies().filter((c) => c.isCustom).length >= LIMITS.maxCurrencies)
      throw new DemoFailure(409, 'KHATA_CURRENCY_LIMIT', [LIMITS.maxCurrencies]);
    const id = this.next();
    this.k.currencies.push({ id, code, name, symbol, ownerId: this.user.id, decimals });
    return this.currency(id)!;
  }

  /** Only an own money type, and only while no book uses it. */
  private deleteCurrency(currencyId: number): KhataDemoResult {
    const currency = this.k.currencies.find((c) => c.id === currencyId && c.ownerId === this.user.id && !c.deleted);
    if (!currency)
      throw new DemoFailure(404, 'KHATA_CURRENCY_NOT_FOUND');
    if (this.k.books.some((b) => b.currencyId === currency.id && !b.deleted))
      throw new DemoFailure(409, 'KHATA_CURRENCY_IN_USE');
    currency.deleted = true;
    return { code: 'KHATA_CURRENCY_DELETED' };
  }

  /** Local or Azure; Azure switched on needs a container and a key (sent now or saved before). The key itself is never kept, only that one was given. */
  private saveStorage(form: Record<string, unknown>): KhataDemoResult {
    const provider = String(form['provider'] ?? '').toLowerCase();
    const accountName = String(form['accountName'] ?? '').trim().toLowerCase();
    const containerName = String(form['containerName'] ?? '').trim().toLowerCase();
    const key = String(form['connectionString'] ?? '').trim();
    const enabled = !!form['enabled'];
    const hasKey = key.length > 0 || this.k.storage.hasKey;
    if ((provider !== 'local' && provider !== 'azure') || (accountName && !ACCOUNT.test(accountName)) || (containerName && !CONTAINER.test(containerName)) || (provider === 'azure' && enabled && (!containerName || !hasKey)))
      throw new DemoFailure(400, 'KHATA_STORAGE_INVALID');
    this.k.storage = { hasKey, enabled, accountName, containerName, provider: provider as KhataStorage['provider'] };
    return { code: 'KHATA_STORAGE_SAVED', data: this.k.storage };
  }

  private csvCell(value: string | number): string {
    const text = String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  private csv(title: string, header: string[], rows: (string | number)[][]): Blob {
    const lines = [[title], [], header, ...rows].map((r) => r.map((c) => this.csvCell(c)).join(','));
    return new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  }

  private money(minor: number, decimals: number): string {
    return (minor / 10 ** decimals).toFixed(decimals);
  }

  private ddmmyyyy(iso: string): string {
    return `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}`;
  }

  /** The list on the screen (every page, up to 5000 rows) as a CSV file with the API's column names. PDF and Excel need the API. */
  private exportEntries(book: KhataDemoBook, contact: KhataDemoContact | null, params: URLSearchParams): KhataDemoResult {
    if (params.get('format') !== 'csv')
      throw new DemoFailure(400, 'KHATA_DEMO_EXPORT');
    const decimals = this.bookDto(book).currency.decimals;
    const rows = this.filtered(book, contact, params).slice(0, LIMITS.maxExportRows).map((e) => this.entryDto(e));
    const header = [this.text('KHATA_EXPORT_DATE'), ...(contact ? [] : [this.text('KHATA_EXPORT_PARTY')]), this.text('KHATA_EXPORT_NOTE'), this.text('KHATA_EXPORT_GAVE'), this.text('KHATA_EXPORT_GOT'), ...(contact ? [this.text('KHATA_EXPORT_BALANCE_AFTER')] : []), this.text('KHATA_EXPORT_STATUS')];
    const lines = rows.map((e) => [this.ddmmyyyy(e.entryDate), ...(contact ? [] : [e.contactName ?? '']), e.note ?? '', e.entryType === KHATA_GAVE ? this.money(e.amountMinor, decimals) : '', e.entryType === KHATA_GAVE ? '' : this.money(e.amountMinor, decimals), ...(contact ? [e.balanceAfterMinor === null || e.balanceAfterMinor === undefined ? '' : this.money(e.balanceAfterMinor, decimals)] : []), this.text(e.isDeleted ? 'KHATA_EXPORT_DELETED' : 'KHATA_EXPORT_ACTIVE')]);
    const title = contact ? this.text('KHATA_EXPORT_STATEMENT_TITLE', [contact.name]) : this.text('KHATA_EXPORT_ENTRIES_TITLE', [book.name]);
    return { file: this.csv(title, header, lines) };
  }

  private exportParties(book: KhataDemoBook, params: URLSearchParams): KhataDemoResult {
    if (params.get('format') !== 'csv')
      throw new DemoFailure(400, 'KHATA_DEMO_EXPORT');
    const decimals = this.bookDto(book).currency.decimals;
    const header = [this.text('KHATA_EXPORT_PARTY'), this.text('KHATA_EXPORT_TYPE'), this.text('KHATA_EXPORT_MOBILE'), this.text('KHATA_EXPORT_EMAIL'), this.text('KHATA_EXPORT_BALANCE'), this.text('KHATA_EXPORT_LAST_ENTRY')];
    const lines = this.contactsOf(book.id).slice(0, LIMITS.maxExportRows).map((c) => this.contactDto(c)).map((c) => [c.name, this.text(c.contactType === 2 ? 'KHATA_EXPORT_SUPPLIER' : 'KHATA_EXPORT_CUSTOMER'), c.mobile ?? '', c.email ?? '', this.money(c.balanceMinor, decimals), c.lastEntryOn ? this.ddmmyyyy(c.lastEntryOn) : '']);
    return { file: this.csv(this.text('KHATA_EXPORT_PARTIES_TITLE', [book.name]), header, lines) };
  }

  // #endregion
}
