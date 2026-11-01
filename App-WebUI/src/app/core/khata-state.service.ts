import { KhataApiService } from './khata-api.service';
import { KhataBook, KhataCurrency } from './models/khata.model';
import { Injectable, computed, inject, signal } from '@angular/core';

/** Books and money types shared by the SnapKhata screens, so the book switcher in the top bar and the pages show the same list. */
@Injectable({ providedIn: 'root' })

export class KhataStateService {
  readonly loaded = signal(false);
  readonly books = signal<KhataBook[]>([]);
  private readonly api = inject(KhataApiService);
  readonly currencies = signal<KhataCurrency[]>([]);
  readonly lastBook = computed(() => this.books().find((b) => b.isLastOpened) ?? this.books()[0] ?? null);

  // #region Public Methods

  book(bookId: number): KhataBook | null {
    return this.books().find((b) => b.id === bookId) ?? null;
  }

  async loadBooks(): Promise<KhataBook[]> {
    this.books.set(await this.api.books());
    this.loaded.set(true);
    return this.books();
  }

  async loadCurrencies(): Promise<KhataCurrency[]> {
    this.currencies.set(await this.api.currencies());
    return this.currencies();
  }

  // #endregion
}
