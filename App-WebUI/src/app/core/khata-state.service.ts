import { SeoService } from './seo.service';
import { I18nService } from './i18n.service';
import { KhataApiService } from './khata-api.service';
import { KhataBook, KhataCurrency } from './models/khata.model';
import { Injectable, computed, inject, signal } from '@angular/core';

/** Books and money types shared by the SnapKhata screens, so the book switcher in the shell and the pages show the same list. */
@Injectable({ providedIn: 'root' })

export class KhataStateService {
  /** The book the reader worked in last in this tab; the tabs and the new-entry button keep pointing at it on the Books and Profile screens. */
  readonly bookId = signal(0);
  /** The screen's name, shown in the shell's top bar on wide screens. */
  readonly title = signal('');
  readonly loaded = signal(false);
  readonly books = signal<KhataBook[]>([]);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  private readonly api = inject(KhataApiService);
  readonly currencies = signal<KhataCurrency[]>([]);
  /** The book the shell links to: the one worked in last, else the one opened last on any device. */
  readonly current = computed(() => this.books().find((b) => b.id === this.bookId()) ?? this.lastBook());
  readonly lastBook = computed(() => this.books().find((b) => b.isLastOpened) ?? this.books()[0] ?? null);

  // #region Public Methods

  /** Names the open screen: the top bar text and the page title. App screens are behind the login, so they are never indexed. */
  screen(title: string): void {
    this.title.set(title);
    this.seo.set({ title: `${title} · ${this.i18n.t('khata.app.name')}`, description: this.i18n.t('seo.khata.desc'), path: '/khata/', image: 'default', lang: this.i18n.lang(), noindex: true });
  }

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

  /** A book of the reader, loading the list first when needed. Throws the API-style 404 when it is not theirs. */
  async ensureBook(bookId: number): Promise<KhataBook> {
    const book = this.book(bookId) ?? (await this.loadBooks()).find((b) => b.id === bookId);
    if (!book)
      throw Object.assign(new Error(this.i18n.t('khata.nf.lead')), { status: 404 });
    return book;
  }

  // #endregion
}
