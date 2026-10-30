import { toSignal } from '@angular/core/rxjs-interop';
import { SeoService } from '../../../core/seo.service';
import { I18nService } from '../../../core/i18n.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { KhataApiService } from '../../../core/khata-api.service';
import { formatDate, formatMoney } from '../../../core/khata-format';
import { KhataStateService } from '../../../core/khata-state.service';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { KhataBookContacts, KhataContactType } from '../../../core/models/khata.model';

/** /khata/app/b/:bookId: the book's contacts with their balances, the book totals, a quick search and "Add contact". */
@Component({
  selector: 'app-khata-contacts',
  imports: [RouterLink],
  templateUrl: './khata-contacts.html',
  styleUrl: './khata-contacts.scss',
})

export class KhataContacts {
  protected readonly error = signal('');
  protected readonly query = signal('');
  protected readonly busy = signal(false);
  private requestKey = crypto.randomUUID();
  private readonly seo = inject(SeoService);
  protected readonly adding = signal(false);
  protected readonly formatDate = formatDate;
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(KhataApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly state = inject(KhataStateService);
  protected readonly data = signal<KhataBookContacts | null>(null);
  protected readonly bookId = computed(() => Number(this.params().get('bookId')));
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  protected readonly visible = computed(() => {
    const q = this.query().trim().toLowerCase();
    const contacts = this.data()?.contacts ?? [];
    return q ? contacts.filter((c) => c.name.toLowerCase().includes(q) || (c.mobile ?? '').includes(q)) : contacts;
  });

  constructor() {
    effect(() => this.seo.set({ title: this.data()?.book.name ?? this.i18n.t('khata.app.name'), description: this.i18n.t('seo.khata.desc'), path: '/khata/', image: 'default', lang: this.i18n.lang(), noindex: true }));
    effect(() => void this.load(this.bookId()));
  }

  // #region Public Methods

  money(minor: number): string {
    const book = this.data()?.book;
    return book ? formatMoney(minor, book.currency, this.i18n.lang()) : '';
  }

  async add(name: string, mobile: string, email: string, type: string): Promise<void> {
    if (this.busy())
      return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.createContact(this.bookId(), { name, mobile: mobile || undefined, email: email || undefined, contactType: Number(type) as KhataContactType }, this.requestKey);
      this.requestKey = crypto.randomUUID();
      this.adding.set(false);
      await this.load(this.bookId());
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  // #endregion

  // #region Private Methods

  private async load(bookId: number): Promise<void> {
    if (!bookId)
      return;
    this.error.set('');
    try {
      this.data.set(await this.api.contacts(bookId));
      await this.api.openBook(bookId);
      void this.state.loadBooks();
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  // #endregion
}
