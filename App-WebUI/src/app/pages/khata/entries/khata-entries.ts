import { toSignal } from '@angular/core/rxjs-interop';
import { KhataIcon } from '../ui/khata-icon/khata-icon';
import { KhataMoneyPipe } from '../ui/khata-money.pipe';
import { I18nService } from '../../../core/i18n.service';
import { groupByMonth } from '../../../core/khata-format';
import { KhataTxRow } from '../ui/khata-tx-row/khata-tx-row';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { KhataExport } from '../ui/khata-export/khata-export';
import { KhataMissing } from '../ui/khata-missing/khata-missing';
import { KhataApiService } from '../../../core/khata-api.service';
import { KhataSkeleton } from '../ui/khata-skeleton/khata-skeleton';
import { KhataStateService } from '../../../core/khata-state.service';
import { KhataEmptyArt } from '../ui/khata-empty-art/khata-empty-art';
import { KhataEntryToolbar } from '../ui/khata-entry-toolbar/khata-entry-toolbar';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { KhataBook, KhataEntry, KhataEntryPage, KhataEntryQuery } from '../../../core/models/khata.model';

/** /khata/app/b/:bookId/entries: every entry of a book, newest first, under month headings; search, type chips, date range and sort run on the server. */
@Component({
  selector: 'app-khata-entries',
  templateUrl: './khata-entries.html',
  styleUrl: './khata-entries.scss',
  imports: [RouterLink, KhataIcon, KhataTxRow, KhataEmptyArt, KhataSkeleton, KhataMissing, KhataMoneyPipe, KhataEntryToolbar, KhataExport],
})

export class KhataEntries {
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  protected readonly missing = signal('');
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(KhataApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly state = inject(KhataStateService);
  protected readonly items = signal<KhataEntry[]>([]);
  protected readonly book = signal<KhataBook | null>(null);
  protected readonly page = signal<KhataEntryPage | null>(null);
  protected readonly bookId = computed(() => Number(this.params().get('bookId')));
  protected readonly groups = computed(() => groupByMonth(this.items(), this.i18n.lang()));
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  protected readonly grouped = computed(() => this.query().sort === 'newest' || this.query().sort === 'oldest');
  protected readonly query = signal<KhataEntryQuery>({ q: '', to: '', from: '', page: 1, kind: 'all', sort: 'newest' });
  protected readonly filtered = computed(() => !!this.query().q.trim() || this.query().kind !== 'all' || !!this.query().from || !!this.query().to);

  constructor() {
    effect(() => this.state.screen(this.i18n.t('khata.nav.entries')));
    effect(() => {
      const bookId = this.bookId();
      const query = this.query();
      untracked(() => void this.load(bookId, query, false));
    });
  }

  // #region Public Methods

  clear(): void {
    this.query.set({ ...this.query(), q: '', kind: 'all', from: '', to: '', page: 1 });
  }

  async more(): Promise<void> {
    await this.load(this.bookId(), { ...this.query(), page: (this.page()?.page ?? 1) + 1 }, true);
  }

  // #endregion

  // #region Private Methods

  private async load(bookId: number, query: KhataEntryQuery, append: boolean): Promise<void> {
    if (!bookId)
      return;
    this.busy.set(true);
    this.error.set('');
    this.missing.set('');
    this.state.bookId.set(bookId);
    try {
      const [book, page] = await Promise.all([this.state.ensureBook(bookId), this.api.bookEntries(bookId, query)]);
      if (this.bookId() !== bookId || (!append && this.query() !== query))
        return;
      this.book.set(book);
      this.page.set(page);
      this.items.update((list) => (append ? [...list, ...page.items] : page.items));
    } catch (e) {
      const err = e as Error & { status?: number };
      (err.status === 404 ? this.missing : this.error).set(err.message);
    } finally {
      this.busy.set(false);
    }
  }

  // #endregion
}
