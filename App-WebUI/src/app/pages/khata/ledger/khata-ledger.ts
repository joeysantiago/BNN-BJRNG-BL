import { toSignal } from '@angular/core/rxjs-interop';
import { KhataIcon } from '../ui/khata-icon/khata-icon';
import { KhataMoneyPipe } from '../ui/khata-money.pipe';
import { I18nService } from '../../../core/i18n.service';
import { groupByMonth } from '../../../core/khata-format';
import { KhataTxRow } from '../ui/khata-tx-row/khata-tx-row';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { KhataAvatar } from '../ui/khata-avatar/khata-avatar';
import { KhataExport } from '../ui/khata-export/khata-export';
import { KhataStatus } from '../ui/khata-status/khata-status';
import { KhataMissing } from '../ui/khata-missing/khata-missing';
import { KhataApiService } from '../../../core/khata-api.service';
import { KhataCountDirective } from '../ui/khata-count.directive';
import { KhataSkeleton } from '../ui/khata-skeleton/khata-skeleton';
import { KhataStateService } from '../../../core/khata-state.service';
import { KhataEmptyArt } from '../ui/khata-empty-art/khata-empty-art';
import { KhataEntryToolbar } from '../ui/khata-entry-toolbar/khata-entry-toolbar';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { KHATA_CUSTOMER, KHATA_GAVE, KHATA_GOT, KhataBook, KhataContact, KhataEntry, KhataEntryPage, KhataEntryQuery } from '../../../core/models/khata.model';

/**
 * /khata/app/b/:bookId/contact/:contactId: one party's ledger. "You gave" raises the balance, "You got" lowers it.
 * Each row shows the balance after it; tapping a row opens the entry's details (edit, delete, history, bill photos).
 */
@Component({
  selector: 'app-khata-ledger',
  templateUrl: './khata-ledger.html',
  styleUrl: './khata-ledger.scss',
  imports: [RouterLink, KhataIcon, KhataTxRow, KhataAvatar, KhataStatus, KhataEmptyArt, KhataSkeleton, KhataMissing, KhataMoneyPipe, KhataCountDirective, KhataEntryToolbar, KhataExport],
})

export class KhataLedger {
  protected readonly got = KHATA_GOT;
  protected readonly gave = KHATA_GAVE;
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  protected readonly missing = signal('');
  protected readonly customer = KHATA_CUSTOMER;
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(KhataApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly state = inject(KhataStateService);
  protected readonly items = signal<KhataEntry[]>([]);
  protected readonly book = signal<KhataBook | null>(null);
  protected readonly page = signal<KhataEntryPage | null>(null);
  protected readonly contact = signal<KhataContact | null>(null);
  protected readonly bookId = computed(() => Number(this.params().get('bookId')));
  protected readonly contactId = computed(() => Number(this.params().get('contactId')));
  protected readonly groups = computed(() => groupByMonth(this.items(), this.i18n.lang()));
  protected readonly tel = computed(() => (this.contact()?.mobile ?? '').replace(/[\s-]/g, ''));
  protected readonly filtered = computed(() => !!this.query().q.trim() || this.query().kind !== 'all');
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  protected readonly grouped = computed(() => this.query().sort === 'newest' || this.query().sort === 'oldest');
  protected readonly query = signal<KhataEntryQuery>({ q: '', to: '', from: '', page: 1, kind: 'all', sort: 'newest' });

  constructor() {
    effect(() => this.state.screen(this.contact()?.name ?? this.i18n.t('khata.nav.parties')));
    effect(() => {
      const bookId = this.bookId();
      const contactId = this.contactId();
      untracked(() => void this.loadContact(bookId, contactId));
    });
    effect(() => {
      const contactId = this.contactId();
      const query = this.query();
      untracked(() => void this.loadEntries(contactId, query, false));
    });
  }

  // #region Public Methods

  async more(): Promise<void> {
    await this.loadEntries(this.contactId(), { ...this.query(), page: (this.page()?.page ?? 1) + 1 }, true);
  }

  // #endregion

  // #region Private Methods

  private async loadContact(bookId: number, contactId: number): Promise<void> {
    if (!bookId || !contactId)
      return;
    this.missing.set('');
    this.contact.set(null);
    this.state.bookId.set(bookId);
    try {
      const data = await this.api.contacts(bookId);
      if (this.contactId() !== contactId)
        return;
      const contact = data.contacts.find((c) => c.id === contactId);
      this.book.set(data.book);
      this.contact.set(contact ?? null);
      if (!contact)
        this.missing.set(this.i18n.t('khata.nf.lead'));
    } catch (e) {
      const err = e as Error & { status?: number };
      (err.status === 404 ? this.missing : this.error).set(err.message);
    }
  }

  private async loadEntries(contactId: number, query: KhataEntryQuery, append: boolean): Promise<void> {
    if (!contactId)
      return;
    this.busy.set(true);
    this.error.set('');
    try {
      const page = await this.api.entries(contactId, query);
      if (this.contactId() !== contactId || (!append && this.query() !== query))
        return;
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
