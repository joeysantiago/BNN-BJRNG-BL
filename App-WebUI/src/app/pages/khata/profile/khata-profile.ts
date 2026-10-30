import { Lang } from '../../../core/site';
import { SeoService } from '../../../core/seo.service';
import { I18nService } from '../../../core/i18n.service';
import { Component, effect, inject, signal } from '@angular/core';
import { KHATA_PIN_PURPOSE } from '../../../core/models/khata.model';
import { KhataSessionService } from '../../../core/khata-session.service';
import { KhataPinPromptService } from '../../../core/khata-pin-prompt.service';

const PIN_PATTERN = /^\d{4,6}$/;

/** /khata/app/profile: language, change PIN (the current PIN is asked as a proof), lock now and log out. */
@Component({
  selector: 'app-khata-profile',
  templateUrl: './khata-profile.html',
  styleUrl: './khata-profile.scss',
})

export class KhataProfile {
  protected readonly info = signal('');
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  private readonly seo = inject(SeoService);
  protected readonly i18n = inject(I18nService);
  private readonly prompt = inject(KhataPinPromptService);
  protected readonly session = inject(KhataSessionService);

  constructor() {
    effect(() => this.seo.set({ title: this.i18n.t('khata.p.title'), description: this.i18n.t('seo.khata.desc'), path: '/khata/', image: 'default', lang: this.i18n.lang(), noindex: true }));
  }

  // #region Public Methods

  setLang(code: string): void {
    this.i18n.set(code as Lang);
  }

  async changePin(pin: HTMLInputElement, again: HTMLInputElement): Promise<void> {
    this.info.set('');
    this.error.set('');
    if (!PIN_PATTERN.test(pin.value))
      return this.error.set(this.i18n.t('khata.p.pinRule'));
    if (pin.value !== again.value)
      return this.error.set(this.i18n.t('khata.pin.mismatch'));
    const proof = await this.prompt.ask({ purpose: KHATA_PIN_PURPOSE.ChangePin, title: this.i18n.t('khata.p.currentPin') });
    if (!proof)
      return;
    this.busy.set(true);
    try {
      this.info.set(await this.session.changePin(pin.value, proof));
      pin.value = '';
      again.value = '';
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  // #endregion
}
