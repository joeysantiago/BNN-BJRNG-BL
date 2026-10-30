import { toSignal } from '@angular/core/rxjs-interop';
import { SeoService } from '../../../core/seo.service';
import { I18nService } from '../../../core/i18n.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { KhataApiService } from '../../../core/khata-api.service';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { KhataPinPromptService } from '../../../core/khata-pin-prompt.service';
import { formatDate, formatMoney, fromMinor, toMinor, todayIso } from '../../../core/khata-format';
import { KHATA_GAVE, KHATA_GOT, KHATA_PIN_PURPOSE, KhataBook, KhataContact, KhataEntry, KhataEntryForm, KhataEntryHistory, KhataEntryRequest, KhataEntryType } from '../../../core/models/khata.model';

/**
 * /khata/app/b/:bookId/contact/:contactId: one contact's ledger. "You gave" raises the balance, "You got" lowers it.
 * Editing or deleting an entry asks for the PIN at the moment of saving, so the single-use proof is fresh.
 */
@Component({
  selector: 'app-khata-ledger',
  imports: [RouterLink],
  templateUrl: './khata-ledger.html',
  styleUrl: './khata-ledger.scss',
})

export class KhataLedger {
  protected readonly got = KHATA_GOT;
  protected readonly page = signal(1);
  protected readonly gave = KHATA_GAVE;
  protected readonly total = signal(0);
  protected readonly error = signal('');
  protected readonly today = todayIso();
  protected readonly busy = signal(false);
  private requestKey = crypto.randomUUID();
  private readonly seo = inject(SeoService);
  protected readonly formatDate = formatDate;
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(KhataApiService);
  protected readonly balance = signal<number>(0);
  private readonly route = inject(ActivatedRoute);
  protected readonly entries = signal<KhataEntry[]>([]);
  private readonly prompt = inject(KhataPinPromptService);
  protected readonly book = signal<KhataBook | null>(null);
  protected readonly form = signal<KhataEntryForm | null>(null);
  protected readonly selected = signal<KhataEntry | null>(null);
  protected readonly contact = signal<KhataContact | null>(null);
  protected readonly history = signal<KhataEntryHistory[] | null>(null);
  protected readonly bookId = computed(() => Number(this.params().get('bookId')));
  protected readonly contactId = computed(() => Number(this.params().get('contactId')));
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });

  constructor() {
    effect(() => this.seo.set({ title: this.contact()?.name ?? this.i18n.t('khata.app.name'), description: this.i18n.t('seo.khata.desc'), path: '/khata/', image: 'default', lang: this.i18n.lang(), noindex: true }));
    effect(() => void this.load(this.bookId(), this.contactId()));
  }

  // #region Public Methods

  close(): void {
    this.form.set(null);
    this.history.set(null);
    this.selected.set(null);
  }

  async more(): Promise<void> {
    await this.loadEntries(this.page() + 1, true);
  }

  money(minor: number): string {
    const book = this.book();
    return book ? formatMoney(minor, book.currency, this.i18n.lang()) : '';
  }

  edit(entry: KhataEntry): void {
    this.close();
    this.form.set({ type: entry.entryType, entry });
  }

  open(type: KhataEntryType): void {
    this.close();
    this.error.set('');
    this.form.set({ type, entry: null });
  }

  amountText(entry: KhataEntry | null): string {
    return entry ? fromMinor(entry.amountMinor, this.book()?.currency.decimals ?? 2) : '';
  }

  async remove(entry: KhataEntry): Promise<void> {
    const proof = await this.prompt.ask({ purpose: KHATA_PIN_PURPOSE.DeleteTransaction, targetId: entry.id, title: this.i18n.t('khata.e.deleteTitle', { amount: this.money(entry.amountMinor) }) });
    if (!proof)
      return;
    await this.run(async () => {
      await this.api.deleteEntry(entry.id, proof);
      this.close();
      await this.reload();
    });
  }

  async showHistory(entry: KhataEntry): Promise<void> {
    await this.run(async () => this.history.set(await this.api.history(entry.id)));
  }

  async save(amount: string, date: string, note: string): Promise<void> {
    const form = this.form();
    const minor = toMinor(amount, this.book()?.currency.decimals ?? 2);
    if (!form || this.busy())
      return;
    if (minor === null)
      return this.error.set(this.i18n.t('khata.e.amountInvalid'));
    const request: KhataEntryRequest = { entryType: form.type, amountMinor: minor, entryDate: date, note: note.trim() || undefined, rowVersion: form.entry?.rowVersion };
    await (form.entry ? this.update(form.entry, request) : this.add(request));
  }

  // #endregion

  // #region Private Methods

  private async reload(): Promise<void> {
    await this.load(this.bookId(), this.contactId());
  }

  private async run(work: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await work();
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  private async add(request: KhataEntryRequest): Promise<void> {
    await this.run(async () => {
      await this.api.addEntry(this.contactId(), request, this.requestKey);
      this.requestKey = crypto.randomUUID();
      this.close();
      await this.reload();
    });
  }

  private async load(bookId: number, contactId: number): Promise<void> {
    if (!bookId || !contactId)
      return;
    await this.run(async () => {
      const data = await this.api.contacts(bookId);
      this.book.set(data.book);
      this.contact.set(data.contacts.find((c) => c.id === contactId) ?? null);
      await this.loadEntries(1, false);
    });
  }

  private async loadEntries(page: number, append: boolean): Promise<void> {
    const result = await this.api.entries(this.contactId(), page);
    this.page.set(result.page);
    this.total.set(result.total);
    this.balance.set(result.balanceMinor);
    this.entries.update((list) => (append ? [...list, ...result.items] : result.items));
  }

  private async update(entry: KhataEntry, request: KhataEntryRequest): Promise<void> {
    const proof = await this.prompt.ask({ purpose: KHATA_PIN_PURPOSE.EditTransaction, targetId: entry.id, title: this.i18n.t('khata.e.editTitle') });
    if (!proof)
      return;
    await this.run(async () => {
      await this.api.updateEntry(entry.id, request, proof);
      this.close();
      await this.reload();
    });
  }

  // #endregion
}
