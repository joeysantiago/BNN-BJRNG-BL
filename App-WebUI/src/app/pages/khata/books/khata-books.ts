import { RouterLink } from '@angular/router';
import { KhataIcon } from '../ui/khata-icon/khata-icon';
import { KhataMoneyPipe } from '../ui/khata-money.pipe';
import { I18nService } from '../../../core/i18n.service';
import { KhataUiService } from '../../../core/khata-ui.service';
import { KhataApiService } from '../../../core/khata-api.service';
import { KhataStateService } from '../../../core/khata-state.service';
import { KhataEmptyArt } from '../ui/khata-empty-art/khata-empty-art';
import { KhataBook, KhataCurrency } from '../../../core/models/khata.model';
import { Component, afterNextRender, computed, effect, inject, signal } from '@angular/core';

/** /khata/app/books: all books (open, edit, delete, new book) with what you will get and give in each, and the reader's own money types. */
@Component({
  selector: 'app-khata-books',
  templateUrl: './khata-books.html',
  styleUrl: './khata-books.scss',
  imports: [RouterLink, KhataIcon, KhataEmptyArt, KhataMoneyPipe],
})

export class KhataBooks {
  protected readonly info = signal('');
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  private requestKey = crypto.randomUUID();
  protected readonly creating = signal(false);
  private readonly ui = inject(KhataUiService);
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(KhataApiService);
  protected readonly state = inject(KhataStateService);
  protected readonly editing = signal<number | null>(null);
  protected readonly custom = computed(() => this.state.currencies().filter((c) => c.isCustom));

  constructor() {
    effect(() => this.state.screen(this.i18n.t('khata.books.title')));
    afterNextRender(() => void this.run(async () => void (await Promise.all([this.state.loadBooks(), this.state.loadCurrencies()]))));
  }

  // #region Public Methods

  toggleCreate(): void {
    this.creating.update((v) => !v);
    this.error.set('');
  }

  async remove(book: KhataBook): Promise<void> {
    if (this.busy() || !(await this.ui.confirm(this.i18n.t('khata.books.deleteTitle', { name: book.name }))))
      return;
    await this.run(async () => {
      this.info.set(await this.api.deleteBook(book.id));
      if (this.state.bookId() === book.id)
        this.state.bookId.set(0);
      await this.state.loadBooks();
    });
  }

  async removeCurrency(currency: KhataCurrency): Promise<void> {
    await this.run(async () => {
      this.info.set(await this.api.deleteCurrency(currency.id));
      await this.state.loadCurrencies();
    });
  }

  async create(name: string, currencyId: string): Promise<void> {
    await this.run(async () => {
      const book = await this.api.createBook({ name: name.trim(), currencyId: Number(currencyId) }, this.requestKey);
      this.requestKey = crypto.randomUUID();
      this.creating.set(false);
      this.ui.notify(this.i18n.t('khata.books.created', { name: book.name }));
      await this.state.loadBooks();
    });
  }

  async update(book: KhataBook, name: string, currencyId: string): Promise<void> {
    await this.run(async () => {
      await this.api.updateBook(book.id, { name: name.trim(), currencyId: Number(currencyId) });
      this.editing.set(null);
      this.ui.notify(this.i18n.t('khata.cs.saved'));
      await this.state.loadBooks();
    });
  }

  async addCurrency(form: HTMLFormElement, code: string, symbol: string, name: string, decimals: string): Promise<void> {
    await this.run(async () => {
      await this.api.addCurrency({ code: code.trim().toUpperCase(), symbol: symbol.trim(), name: name.trim(), decimals: Number(decimals) });
      form.reset();
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
