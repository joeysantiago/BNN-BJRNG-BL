import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { I18nService } from './i18n.service';
import { Injectable, inject } from '@angular/core';
import { KhataAttachment, KhataBook, KhataBookContacts, KhataBookRequest, KhataBookSummary, KhataContact, KhataContactRequest, KhataCurrency, KhataCurrencyRequest, KhataEntry, KhataEntryDetail, KhataEntryHistory, KhataEntryPage, KhataEntryQuery, KhataEntryRequest, KhataUpload, KhataExportFormat, KhataNotify, KhataSettings, KhataStorage, KhataStorageRequest } from './models/khata.model';

const TIMEOUT = 30000;
const UPLOAD_TIMEOUT = 120000;
const IDEMPOTENCY = 'X-Idempotency-Key';

/**
 * SnapKhata ledger endpoints. They use the common login (ApiService adds the Bearer token and refreshes it after a 401).
 * Creates send an idempotency key made when the form opened, so a double tap or a retry never saves twice.
 */
@Injectable({ providedIn: 'root' })

export class KhataApiService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);

  // #region Public Methods

  books(): Promise<KhataBook[]> {
    return this.call('GET', '/khata/books');
  }

  testStorage(): Promise<string> {
    return this.call('POST', '/khata/storage/test', {}, {}, true);
  }

  storage(): Promise<KhataStorage> {
    return this.call('GET', '/khata/storage');
  }

  settings(): Promise<KhataSettings> {
    return this.call('GET', '/khata/settings');
  }

  currencies(): Promise<KhataCurrency[]> {
    return this.call('GET', '/khata/currencies');
  }

  /** A bill photo as a file. The API needs the login token, so an <img> can't load it directly; the caller makes a blob URL. */
  photo(attachmentId: number): Promise<Blob> {
    return this.api.blob(`/khata/attachments/${attachmentId}`, { headers: this.headers() }, TIMEOUT);
  }

  deleteBook(bookId: number): Promise<string> {
    return this.call('DELETE', `/khata/books/${bookId}`, undefined, {}, true);
  }

  openBook(bookId: number): Promise<KhataBook> {
    return this.call('PUT', `/khata/books/${bookId}/open`);
  }

  deleteEntry(entryId: number): Promise<string> {
    return this.call('DELETE', `/khata/transactions/${entryId}`, undefined, {}, true);
  }

  entry(entryId: number): Promise<KhataEntryDetail> {
    return this.call('GET', `/khata/transactions/${entryId}`);
  }

  deleteContact(contactId: number): Promise<string> {
    return this.call('DELETE', `/khata/contacts/${contactId}`, undefined, {}, true);
  }

  deletePhoto(attachmentId: number): Promise<string> {
    return this.call('DELETE', `/khata/attachments/${attachmentId}`, undefined, {}, true);
  }

  deleteCurrency(currencyId: number): Promise<string> {
    return this.call('DELETE', `/khata/currencies/${currencyId}`, undefined, {}, true);
  }

  contacts(bookId: number): Promise<KhataBookContacts> {
    return this.call('GET', `/khata/books/${bookId}/contacts`);
  }

  history(entryId: number): Promise<KhataEntryHistory[]> {
    return this.call('GET', `/khata/transactions/${entryId}/history`);
  }

  notifications(contactId: number): Promise<KhataNotify> {
    return this.call('GET', `/khata/contacts/${contactId}/notifications`);
  }

  deleteContactPhoto(contactId: number): Promise<string> {
    return this.call('DELETE', `/khata/contacts/${contactId}/photo`, undefined, {}, true);
  }

  saveStorage(request: KhataStorageRequest): Promise<string> {
    return this.call('PUT', '/khata/storage', request, {}, true);
  }

  saveSettings(notificationsEnabled: boolean): Promise<string> {
    return this.call('PUT', '/khata/settings', { notificationsEnabled }, {}, true);
  }

  /** A contact's profile picture as a file (the API needs the login token). `version` makes a new upload a new address. */
  contactPhoto(contactId: number, version: string): Promise<Blob> {
    return this.api.blob(`/khata/contacts/${contactId}/photo?v=${encodeURIComponent(version)}`, { headers: this.headers() }, TIMEOUT);
  }

  /** The dashboard of a book. `today` is the browser's own date, so "this month" is the reader's month. */
  summary(bookId: number, today: string): Promise<KhataBookSummary> {
    return this.call('GET', `/khata/books/${bookId}/summary?today=${today}`);
  }

  addCurrency(request: KhataCurrencyRequest): Promise<KhataCurrency> {
    return this.call('POST', '/khata/currencies', request);
  }

  createBook(request: KhataBookRequest, key: string): Promise<KhataBook> {
    return this.call('POST', '/khata/books', request, { [IDEMPOTENCY]: key });
  }

  setPermission(contactId: number, allow: boolean): Promise<KhataContact> {
    return this.call('PUT', `/khata/contacts/${contactId}/permissions`, { allowContactEntries: allow });
  }

  updateBook(bookId: number, request: KhataBookRequest): Promise<KhataBook> {
    return this.call('PUT', `/khata/books/${bookId}`, request);
  }

  entries(contactId: number, query: KhataEntryQuery): Promise<KhataEntryPage> {
    return this.call('GET', `/khata/contacts/${contactId}/transactions?${this.query(query)}`);
  }

  bookEntries(bookId: number, query: KhataEntryQuery): Promise<KhataEntryPage> {
    return this.call('GET', `/khata/books/${bookId}/transactions?${this.query(query)}`);
  }

  updateEntry(entryId: number, request: KhataEntryRequest): Promise<KhataEntry> {
    return this.call('PUT', `/khata/transactions/${entryId}`, request);
  }

  setNotifications(contactId: number, notify: KhataNotify): Promise<KhataNotify> {
    return this.call('PUT', `/khata/contacts/${contactId}/notifications`, notify);
  }

  /** Uploads a contact's profile picture (already made small in the browser); the answer is the updated contact. */
  async setContactPhoto(contactId: number, photo: KhataUpload): Promise<KhataContact> {
    const form = new FormData();
    form.append('file', photo.blob, photo.name);
    const res = await this.api.sendFull<KhataContact>('PUT', `/khata/contacts/${contactId}/photo`, { headers: this.headers(), body: form }, UPLOAD_TIMEOUT);
    return res.data;
  }

  updateContact(contactId: number, request: KhataContactRequest): Promise<KhataContact> {
    return this.call('PUT', `/khata/contacts/${contactId}`, request);
  }

  /** Uploads compressed bill photos to an entry; the answer is every photo the entry has now. */
  async uploadPhotos(entryId: number, files: KhataUpload[]): Promise<KhataAttachment[]> {
    const form = new FormData();
    files.forEach((f) => form.append('files', f.blob, f.name));
    const res = await this.api.sendFull<KhataAttachment[]>('POST', `/khata/transactions/${entryId}/attachments`, { headers: this.headers(), body: form }, UPLOAD_TIMEOUT);
    return res.data;
  }

  addEntry(contactId: number, request: KhataEntryRequest, key: string): Promise<KhataEntry> {
    return this.call('POST', `/khata/contacts/${contactId}/transactions`, request, { [IDEMPOTENCY]: key });
  }

  /** A PDF, Excel or CSV file of a list, built by the API from the same filters as the screen (every page). `path` is the list's address, such as /khata/books/1/transactions. */
  exportFile(path: string, format: KhataExportFormat, query?: KhataEntryQuery): Promise<Blob> {
    const params = query ? this.query(query) + '&' : '';
    return this.api.blob(`${path}/export?${params}format=${format}`, { headers: this.headers() }, UPLOAD_TIMEOUT);
  }

  createContact(bookId: number, request: KhataContactRequest, key: string): Promise<KhataContact> {
    return this.call('POST', `/khata/books/${bookId}/contacts`, request, { [IDEMPOTENCY]: key });
  }

  // #endregion

  // #region Private Methods

  /** Every SnapKhata request sends this device's id and the chosen language for the server's messages. */
  private headers(): Record<string, string> {
    return { 'X-Khata-Device': this.auth.deviceId(), 'Accept-Language': this.i18n.lang() };
  }

  /** Query string of an entry list; empty filters are left out. */
  private query(query: KhataEntryQuery): string {
    const params = new URLSearchParams({ page: String(query.page), kind: query.kind, sort: query.sort });
    if (query.from)
      params.set('from', query.from);
    if (query.to)
      params.set('to', query.to);
    if (query.q.trim())
      params.set('q', query.q.trim());
    return params.toString();
  }

  /** `messageOnly` returns the server's message instead of the data. */
  private async call<T>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}, messageOnly = false): Promise<T> {
    const all = { ...this.headers(), ...headers };
    const res = await this.api.sendFull<T>(method, path, body === undefined ? { headers: all } : this.api.json(body, all), TIMEOUT);
    return (messageOnly ? res.message ?? '' : res.data) as T;
  }

  // #endregion
}
