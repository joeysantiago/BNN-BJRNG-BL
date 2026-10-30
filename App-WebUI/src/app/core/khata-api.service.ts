import { Injectable, inject } from '@angular/core';
import { KhataSessionService } from './khata-session.service';
import { KhataBook, KhataBookContacts, KhataBookRequest, KhataContact, KhataContactRequest, KhataCurrency, KhataCurrencyRequest, KhataEntry, KhataEntryHistory, KhataEntryPage, KhataEntryRequest } from './models/khata.model';

const PROOF = 'X-Khata-Pin-Proof';
const IDEMPOTENCY = 'X-Idempotency-Key';

/** SnapKhata ledger endpoints. Creates send an idempotency key made when the form opened, so a double tap or a retry never saves twice. */
@Injectable({ providedIn: 'root' })

export class KhataApiService {
  private readonly session = inject(KhataSessionService);

  // #region Public Methods

  books(): Promise<KhataBook[]> {
    return this.session.call('GET', '/khata/books');
  }

  currencies(): Promise<KhataCurrency[]> {
    return this.session.call('GET', '/khata/currencies');
  }

  openBook(bookId: number): Promise<KhataBook> {
    return this.session.call('PUT', `/khata/books/${bookId}/open`);
  }

  deleteCurrency(currencyId: number): Promise<string> {
    return this.session.call('DELETE', `/khata/currencies/${currencyId}`, undefined, {}, true);
  }

  contacts(bookId: number): Promise<KhataBookContacts> {
    return this.session.call('GET', `/khata/books/${bookId}/contacts`);
  }

  history(entryId: number): Promise<KhataEntryHistory[]> {
    return this.session.call('GET', `/khata/transactions/${entryId}/history`);
  }

  deleteBook(bookId: number, proof: string): Promise<string> {
    return this.session.call('DELETE', `/khata/books/${bookId}`, undefined, { [PROOF]: proof }, true);
  }

  deleteEntry(entryId: number, proof: string): Promise<string> {
    return this.session.call('DELETE', `/khata/transactions/${entryId}`, undefined, { [PROOF]: proof }, true);
  }

  deleteContact(contactId: number, proof: string): Promise<string> {
    return this.session.call('DELETE', `/khata/contacts/${contactId}`, undefined, { [PROOF]: proof }, true);
  }

  entries(contactId: number, page: number): Promise<KhataEntryPage> {
    return this.session.call('GET', `/khata/contacts/${contactId}/transactions?page=${page}`);
  }

  addCurrency(request: KhataCurrencyRequest): Promise<KhataCurrency> {
    return this.session.call('POST', '/khata/currencies', request);
  }

  createBook(request: KhataBookRequest, key: string): Promise<KhataBook> {
    return this.session.call('POST', '/khata/books', request, { [IDEMPOTENCY]: key });
  }

  updateBook(bookId: number, request: KhataBookRequest): Promise<KhataBook> {
    return this.session.call('PUT', `/khata/books/${bookId}`, request);
  }

  updateContact(contactId: number, request: KhataContactRequest): Promise<KhataContact> {
    return this.session.call('PUT', `/khata/contacts/${contactId}`, request);
  }

  setPermission(contactId: number, allow: boolean, proof?: string): Promise<KhataContact> {
    return this.session.call('PUT', `/khata/contacts/${contactId}/permissions`, { allowContactEntries: allow }, proof ? { [PROOF]: proof } : {});
  }

  addEntry(contactId: number, request: KhataEntryRequest, key: string): Promise<KhataEntry> {
    return this.session.call('POST', `/khata/contacts/${contactId}/transactions`, request, { [IDEMPOTENCY]: key });
  }

  updateEntry(entryId: number, request: KhataEntryRequest, proof: string): Promise<KhataEntry> {
    return this.session.call('PUT', `/khata/transactions/${entryId}`, request, { [PROOF]: proof });
  }

  createContact(bookId: number, request: KhataContactRequest, key: string): Promise<KhataContact> {
    return this.session.call('POST', `/khata/books/${bookId}/contacts`, request, { [IDEMPOTENCY]: key });
  }

  // #endregion
}
