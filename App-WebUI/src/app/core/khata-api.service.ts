import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { I18nService } from './i18n.service';
import { Injectable, inject } from '@angular/core';
import { KhataBook, KhataBookContacts, KhataBookRequest, KhataContact, KhataContactRequest, KhataCurrency, KhataCurrencyRequest, KhataEntry, KhataEntryHistory, KhataEntryPage, KhataEntryRequest } from './models/khata.model';

const TIMEOUT = 30000;
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

  currencies(): Promise<KhataCurrency[]> {
    return this.call('GET', '/khata/currencies');
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

  deleteContact(contactId: number): Promise<string> {
    return this.call('DELETE', `/khata/contacts/${contactId}`, undefined, {}, true);
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

  entries(contactId: number, page: number): Promise<KhataEntryPage> {
    return this.call('GET', `/khata/contacts/${contactId}/transactions?page=${page}`);
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

  updateEntry(entryId: number, request: KhataEntryRequest): Promise<KhataEntry> {
    return this.call('PUT', `/khata/transactions/${entryId}`, request);
  }

  updateContact(contactId: number, request: KhataContactRequest): Promise<KhataContact> {
    return this.call('PUT', `/khata/contacts/${contactId}`, request);
  }

  addEntry(contactId: number, request: KhataEntryRequest, key: string): Promise<KhataEntry> {
    return this.call('POST', `/khata/contacts/${contactId}/transactions`, request, { [IDEMPOTENCY]: key });
  }

  createContact(bookId: number, request: KhataContactRequest, key: string): Promise<KhataContact> {
    return this.call('POST', `/khata/books/${bookId}/contacts`, request, { [IDEMPOTENCY]: key });
  }

  // #endregion

  // #region Private Methods

  /** Every SnapKhata request sends this device's id and the chosen language for the server's messages. `messageOnly` returns the server's message instead of the data. */
  private async call<T>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}, messageOnly = false): Promise<T> {
    const all = { 'X-Khata-Device': this.auth.deviceId(), 'Accept-Language': this.i18n.lang(), ...headers };
    const res = await this.api.sendFull<T>(method, path, body === undefined ? { headers: all } : this.api.json(body, all), TIMEOUT);
    return (messageOnly ? res.message ?? '' : res.data) as T;
  }

  // #endregion
}
