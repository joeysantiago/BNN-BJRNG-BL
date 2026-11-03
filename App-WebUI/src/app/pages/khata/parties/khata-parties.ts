import { KhataDatePipe } from '../ui/khata-date.pipe';
import { toSignal } from '@angular/core/rxjs-interop';
import { KhataIcon } from '../ui/khata-icon/khata-icon';
import { KhataMoneyPipe } from '../ui/khata-money.pipe';
import { I18nService } from '../../../core/i18n.service';
import { contactErrors } from '../../../core/khata-format';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { KhataAvatar } from '../ui/khata-avatar/khata-avatar';
import { KhataExport } from '../ui/khata-export/khata-export';
import { KhataStatus } from '../ui/khata-status/khata-status';
import { KhataUiService } from '../../../core/khata-ui.service';
import { KhataMissing } from '../ui/khata-missing/khata-missing';
import { KhataApiService } from '../../../core/khata-api.service';
import { KhataSkeleton } from '../ui/khata-skeleton/khata-skeleton';
import { KhataStateService } from '../../../core/khata-state.service';
import { KhataEmptyArt } from '../ui/khata-empty-art/khata-empty-art';
import { Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { KHATA_CUSTOMER, KHATA_SUPPLIER, KhataBookContacts, KhataContactType, KhataPartyKind, KhataPartyRow, KhataPartySort, KhataPartyStatus } from '../../../core/models/khata.model';

/** /khata/app/b/:bookId/parties: customers and suppliers of a book with their balance; search, sort, filter by type and status, and add a party. */
@Component({
  selector: 'app-khata-parties',
  templateUrl: './khata-parties.html',
  styleUrl: './khata-parties.scss',
  imports: [RouterLink, KhataIcon, KhataAvatar, KhataStatus, KhataEmptyArt, KhataSkeleton, KhataMissing, KhataMoneyPipe, KhataDatePipe, KhataExport],
})

export class KhataParties {
  protected readonly q = signal('');
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  protected readonly missing = signal('');
  private requestKey = crypto.randomUUID();
  protected readonly adding = signal(false);
  protected readonly formError = signal('');
  private readonly ui = inject(KhataUiService);
  protected readonly customer = KHATA_CUSTOMER;
  protected readonly supplier = KHATA_SUPPLIER;
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(KhataApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly state = inject(KhataStateService);
  protected readonly kind = signal<KhataPartyKind>('all');
  protected readonly sort = signal<KhataPartySort>('recent');
  protected readonly status = signal<KhataPartyStatus>('all');
  protected readonly data = signal<KhataBookContacts | null>(null);
  protected readonly invalid = signal<Record<string, boolean>>({});
  protected readonly kinds: KhataPartyKind[] = ['all', 'customers', 'suppliers'];
  protected readonly sorts: KhataPartySort[] = ['recent', 'name', 'high', 'low'];
  protected readonly bookId = computed(() => Number(this.params().get('bookId')));
  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');
  protected readonly statuses: KhataPartyStatus[] = ['all', 'collect', 'pay', 'settled'];
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  private readonly query = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  protected readonly filtered = computed(() => !!this.q().trim() || this.kind() !== 'all' || this.status() !== 'all');
  protected readonly counts = computed(() => {
    const all = this.data()?.contacts ?? [];
    return { all: all.length, customers: all.filter((c) => c.contactType === KHATA_CUSTOMER).length, suppliers: all.filter((c) => c.contactType === KHATA_SUPPLIER).length };
  });
  protected readonly sums = computed(() => {
    const all = this.data()?.contacts ?? [];
    return { get: all.filter((c) => c.balanceMinor > 0).reduce((s, c) => s + c.balanceMinor, 0), give: all.filter((c) => c.balanceMinor < 0).reduce((s, c) => s - c.balanceMinor, 0) };
  });
  protected readonly rows = computed<KhataPartyRow[]>(() => {
    const q = this.q().trim().toLowerCase();
    const digits = q.replace(/\s/g, '');
    const kind = this.kind();
    const status = this.status();
    const locale = this.i18n.info().locale.replace('_', '-');
    const rows = (this.data()?.contacts ?? []).map((contact) => ({ contact, balance: contact.balanceMinor, last: contact.lastEntryOn ?? null }))
      .filter(({ contact }) => kind === 'all' || contact.contactType === (kind === 'customers' ? KHATA_CUSTOMER : KHATA_SUPPLIER))
      .filter(({ balance, last }) => status === 'all' || (status === 'collect' ? balance > 0 : status === 'pay' ? balance < 0 : balance === 0 && !!last))
      .filter(({ contact }) => !q || contact.name.toLowerCase().includes(q) || (contact.mobile ?? '').replace(/\s/g, '').includes(digits) || (contact.email ?? '').toLowerCase().includes(q));
    const sorters: Record<KhataPartySort, (a: KhataPartyRow, b: KhataPartyRow) => number> = {
      recent: (a, b) => (b.last ?? '').localeCompare(a.last ?? ''),
      name: (a, b) => a.contact.name.localeCompare(b.contact.name, locale),
      high: (a, b) => Math.abs(b.balance) - Math.abs(a.balance),
      low: (a, b) => Math.abs(a.balance) - Math.abs(b.balance),
    };
    return rows.sort(sorters[this.sort()]);
  });

  constructor() {
    effect(() => this.state.screen(this.i18n.t('khata.nav.parties')));
    effect(() => {
      const bookId = this.bookId();
      untracked(() => void this.load(bookId));
    });
    // The dashboard's "Add contact" opens this screen with ?add=1.
    effect(() => {
      if (this.query().get('add') === '1')
        untracked(() => this.toggleAdd(true));
    });
  }

  // #region Public Methods

  clearFilters(): void {
    this.q.set('');
    this.kind.set('all');
    this.status.set('all');
  }

  toggleAdd(open = !this.adding()): void {
    this.adding.set(open);
    this.formError.set('');
    this.invalid.set({});
    if (open)
      setTimeout(() => this.nameInput()?.nativeElement.focus());
  }

  kindLabel(kind: KhataPartyKind): string {
    return this.i18n.t('khata.f.' + kind);
  }

  statusLabel(status: KhataPartyStatus): string {
    return this.i18n.t({ all: 'khata.f.all', collect: 'khata.s.toCollect', pay: 'khata.s.toPay', settled: 'khata.s.paid' }[status]);
  }

  async create(form: HTMLFormElement): Promise<void> {
    if (this.busy())
      return;
    const data = new FormData(form);
    const fields = { name: String(data.get('name') ?? '').trim(), mobile: String(data.get('mobile') ?? '').trim(), email: String(data.get('email') ?? '').trim() };
    const errors = contactErrors(fields.name, fields.mobile, fields.email);
    this.invalid.set(errors);
    if (Object.values(errors).some(Boolean)) {
      this.formError.set(this.i18n.t('khata.c.invalid'));
      setTimeout(() => form.querySelector<HTMLElement>('[aria-invalid=true]')?.focus());
      return;
    }
    this.busy.set(true);
    this.formError.set('');
    try {
      await this.api.createContact(this.bookId(), { name: fields.name, mobile: fields.mobile || undefined, email: fields.email || undefined, contactType: Number(data.get('type')) as KhataContactType }, this.requestKey);
      this.requestKey = crypto.randomUUID();
      this.adding.set(false);
      this.ui.notify(this.i18n.t('khata.c.added', { name: fields.name }));
      await this.load(this.bookId(), false);
      void this.state.loadBooks().catch(() => null);
    } catch (e) {
      this.formError.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  // #endregion

  // #region Private Methods

  private async load(bookId: number, skeleton = true): Promise<void> {
    if (!bookId)
      return;
    if (skeleton)
      this.data.set(null);
    this.error.set('');
    this.missing.set('');
    this.state.bookId.set(bookId);
    try {
      const data = await this.api.contacts(bookId);
      if (this.bookId() === bookId)
        this.data.set(data);
    } catch (e) {
      const err = e as Error & { status?: number };
      (err.status === 404 ? this.missing : this.error).set(err.message);
    }
  }

  // #endregion
}
