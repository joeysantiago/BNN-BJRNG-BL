import { fileSize } from '../../../core/khata-photos';
import { KhataDatePipe } from '../ui/khata-date.pipe';
import { toSignal } from '@angular/core/rxjs-interop';
import { KhataIcon } from '../ui/khata-icon/khata-icon';
import { KhataMoneyPipe } from '../ui/khata-money.pipe';
import { I18nService } from '../../../core/i18n.service';
import { formatMoney } from '../../../core/khata-format';
import { KhataUiService } from '../../../core/khata-ui.service';
import { KhataMissing } from '../ui/khata-missing/khata-missing';
import { KhataApiService } from '../../../core/khata-api.service';
import { KhataSkeleton } from '../ui/khata-skeleton/khata-skeleton';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { KhataStateService } from '../../../core/khata-state.service';
import { KhataEmptyArt } from '../ui/khata-empty-art/khata-empty-art';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { KHATA_GAVE, KhataBook, KhataEntryDetail, KhataEntryHistory } from '../../../core/models/khata.model';

/** /khata/app/b/:bookId/e/:entryId: one entry: amount, details, bill photos (full-screen viewer) and every version of it. Its owner can edit or delete it. */
@Component({
  selector: 'app-khata-entry',
  templateUrl: './khata-entry.html',
  styleUrl: './khata-entry.scss',
  imports: [RouterLink, KhataIcon, KhataEmptyArt, KhataSkeleton, KhataMissing, KhataMoneyPipe, KhataDatePipe],
})

export class KhataEntryDetails {
  protected readonly error = signal('');
  protected readonly fileSize = fileSize;
  protected readonly busy = signal(false);
  protected readonly missing = signal('');
  private readonly router = inject(Router);
  protected readonly gaveType = KHATA_GAVE;
  private readonly ui = inject(KhataUiService);
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(KhataApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly state = inject(KhataStateService);
  protected readonly book = signal<KhataBook | null>(null);
  protected readonly history = signal<KhataEntryHistory[]>([]);
  protected readonly urls = signal<Record<number, string>>({});
  protected readonly data = signal<KhataEntryDetail | null>(null);
  protected readonly bookId = computed(() => Number(this.params().get('bookId')));
  protected readonly entryId = computed(() => Number(this.params().get('entryId')));
  protected readonly gave = computed(() => this.data()?.entry.entryType === KHATA_GAVE);
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  /** Newest version first; the API keeps one row per change, the newest being the entry as it is now. */
  protected readonly versions = computed(() => [...this.history()].sort((a, b) => b.version - a.version));
  protected readonly editable = computed(() => !!this.data() && this.data()!.entry.addedByMe && !this.data()!.entry.isDeleted);

  constructor() {
    effect(() => this.state.screen(this.i18n.t('khata.td.title')));
    effect(() => {
      const bookId = this.bookId();
      const entryId = this.entryId();
      untracked(() => void this.load(bookId, entryId));
    });
  }

  // #region Public Methods

  view(index: number): void {
    const items = (this.data()?.attachments ?? []).map((a) => ({ name: a.fileName, url: this.urls()[a.id] ?? null, attachmentId: a.id }));
    void this.ui.show(items, index);
  }

  async remove(): Promise<void> {
    const d = this.data();
    const book = this.book();
    if (!d || !book || this.busy() || !(await this.ui.confirm(this.i18n.t('khata.e.deleteTitle', { amount: formatMoney(d.entry.amountMinor, book.currency, this.i18n.lang()) }))))
      return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.deleteEntry(d.entry.id);
      this.ui.notify(this.i18n.t('khata.td.deleted'));
      void this.state.loadBooks().catch(() => null);
      void this.router.navigateByUrl(`/khata/app/b/${this.bookId()}/contact/${d.contact.id}`, { replaceUrl: true });
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  changeLabel(type: number): string {
    return this.i18n.t(type === 3 ? 'khata.e.deleted' : type === 2 ? 'khata.td.changed' : 'khata.td.created');
  }

  // #endregion

  // #region Private Methods

  private async load(bookId: number, entryId: number): Promise<void> {
    if (!bookId || !entryId)
      return;
    this.data.set(null);
    this.error.set('');
    this.missing.set('');
    this.state.bookId.set(bookId);
    try {
      const [book, data, history] = await Promise.all([this.state.ensureBook(bookId), this.api.entry(entryId), this.api.history(entryId)]);
      if (data.bookId !== bookId)
        throw Object.assign(new Error(this.i18n.t('khata.nf.lead')), { status: 404 });
      this.book.set(book);
      this.history.set(history);
      this.data.set(data);
      data.attachments.forEach((a) => void this.ui.photoUrl(a.id).then((url) => url && this.urls.update((all) => ({ ...all, [a.id]: url }))));
    } catch (e) {
      const err = e as Error & { status?: number };
      (err.status === 404 ? this.missing : this.error).set(err.message);
    }
  }

  // #endregion
}
