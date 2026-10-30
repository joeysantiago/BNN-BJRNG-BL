import { RouterLink } from '@angular/router';
import { SeoService } from '../../../core/seo.service';
import { I18nService } from '../../../core/i18n.service';
import { formatMoney } from '../../../core/khata-format';
import { KhataApiService } from '../../../core/khata-api.service';
import { KhataStateService } from '../../../core/khata-state.service';
import { KhataPinPromptService } from '../../../core/khata-pin-prompt.service';
import { Component, afterNextRender, computed, effect, inject, signal } from '@angular/core';
import { KHATA_PIN_PURPOSE, KhataBook, KhataCurrency } from '../../../core/models/khata.model';

/** /khata/app/books: all books (open, rename, delete with PIN, new book) and the user's own money types. */
@Component({
  selector: 'app-khata-books',
  imports: [RouterLink],
  templateUrl: './khata-books.html',
  styleUrl: './khata-books.scss',
})

export class KhataBooks {
  protected readonly info = signal('');
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  private requestKey = crypto.randomUUID();
  private readonly seo = inject(SeoService);
  protected readonly creating = signal(false);
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(KhataApiService);
  protected readonly state = inject(KhataStateService);
  private readonly prompt = inject(KhataPinPromptService);
  protected readonly editing = signal<KhataBook | null>(null);
  protected readonly custom = computed(() => this.state.currencies().filter((c) => c.isCustom));

  constructor() {
    effect(() => this.seo.set({ title: this.i18n.t('khata.books.title'), description: this.i18n.t('seo.khata.desc'), path: '/khata/', image: 'default', lang: this.i18n.lang(), noindex: true }));
    afterNextRender(() => void this.run(async () => void (await Promise.all([this.state.loadBooks(), this.state.loadCurrencies()]))));
  }

  // #region Public Methods

  async remove(book: KhataBook): Promise<void> {
    const proof = await this.prompt.ask({ purpose: KHATA_PIN_PURPOSE.DeleteBook, targetId: book.id, title: this.i18n.t('khata.books.deleteTitle', { name: book.name }) });
    if (!proof)
      return;
    await this.run(async () => {
      this.info.set(await this.api.deleteBook(book.id, proof));
      await this.state.loadBooks();
    });
  }

  money(minor: number, currency: KhataCurrency): string {
    return formatMoney(minor, currency, this.i18n.lang());
  }

  async removeCurrency(currency: KhataCurrency): Promise<void> {
    await this.run(async () => {
      this.info.set(await this.api.deleteCurrency(currency.id));
      await this.state.loadCurrencies();
    });
  }

  async create(name: string, currencyId: string): Promise<void> {
    await this.run(async () => {
      await this.api.createBook({ name: name.trim(), currencyId: Number(currencyId) }, this.requestKey);
      this.requestKey = crypto.randomUUID();
      this.creating.set(false);
      await this.state.loadBooks();
    });
  }

  async update(book: KhataBook, name: string, currencyId: string): Promise<void> {
    await this.run(async () => {
      await this.api.updateBook(book.id, { name: name.trim(), currencyId: Number(currencyId) });
      this.editing.set(null);
      await this.state.loadBooks();
    });
  }

  async addCurrency(code: string, symbol: string, name: string, decimals: string): Promise<void> {
    await this.run(async () => {
      await this.api.addCurrency({ code, symbol, name, decimals: Number(decimals) });
      await this.state.loadCurrencies();
    });
  }

  // #endregion

  // #region Private Methods

  private async run(work: () => Promise<void>): Promise<void> {
    if (this.busy())
      return;
    this.busy.set(true);
    this.error.set('');
    this.info.set('');
    try {
      await work();
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  // #endregion
}
