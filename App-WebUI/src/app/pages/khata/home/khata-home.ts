import { Router } from '@angular/router';
import { SeoService } from '../../../core/seo.service';
import { I18nService } from '../../../core/i18n.service';
import { KhataApiService } from '../../../core/khata-api.service';
import { KhataStateService } from '../../../core/khata-state.service';
import { Component, afterNextRender, effect, inject, signal } from '@angular/core';

/** /khata/app: opens the last used book. A new user first creates a book and picks its money type (fixed after the first entry). */
@Component({
  selector: 'app-khata-home',
  templateUrl: './khata-home.html',
  styleUrl: './khata-home.scss',
})

export class KhataHome {
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  private readonly router = inject(Router);
  protected readonly ready = signal(false);
  private readonly seo = inject(SeoService);
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(KhataApiService);
  private readonly requestKey = crypto.randomUUID();
  protected readonly state = inject(KhataStateService);

  constructor() {
    effect(() => this.seo.set({ title: this.i18n.t('khata.app.name'), description: this.i18n.t('seo.khata.desc'), path: '/khata/', image: 'default', lang: this.i18n.lang(), noindex: true }));
    afterNextRender(() => void this.start());
  }

  // #region Public Methods

  async create(name: string, currencyId: string): Promise<void> {
    if (this.busy())
      return;
    this.busy.set(true);
    this.error.set('');
    try {
      const book = await this.api.createBook({ name: name.trim(), currencyId: Number(currencyId) }, this.requestKey);
      await this.state.loadBooks();
      void this.router.navigateByUrl(`/khata/app/b/${book.id}`, { replaceUrl: true });
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  // #endregion

  // #region Private Methods

  private async start(): Promise<void> {
    try {
      const books = await this.state.loadBooks();
      const last = this.state.lastBook();
      if (books.length && last) {
        void this.router.navigateByUrl(`/khata/app/b/${last.id}`, { replaceUrl: true });
        return;
      }
      await this.state.loadCurrencies();
      this.ready.set(true);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  // #endregion
}
