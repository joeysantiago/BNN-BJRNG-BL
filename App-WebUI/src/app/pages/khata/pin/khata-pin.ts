import { KhataKeypad } from '../keypad/khata-keypad';
import { SeoService } from '../../../core/seo.service';
import { I18nService } from '../../../core/i18n.service';
import { ActivatedRoute, Router } from '@angular/router';
import { KhataPinMode } from '../../../core/models/khata.model';
import { KhataSessionService } from '../../../core/khata-session.service';
import { Component, computed, effect, inject, signal } from '@angular/core';

const MIN_PIN = 4;

/** /khata/set-pin (first login, or after "Forgot PIN") and /khata/unlock (every time the app is opened). */
@Component({
  selector: 'app-khata-pin',
  imports: [KhataKeypad],
  templateUrl: './khata-pin.html',
  styleUrl: './khata-pin.scss',
})

export class KhataPin {
  protected readonly minPin = MIN_PIN;
  protected readonly pin = signal('');
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  protected readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute);
  protected readonly first = signal<string | null>(null);
  protected readonly session = inject(KhataSessionService);
  protected readonly mode: KhataPinMode = this.route.snapshot.data['mode'] === 'set' ? 'set' : 'unlock';
  protected readonly title = computed(() => this.i18n.t(this.mode === 'unlock' ? 'khata.pin.unlockTitle' : this.first() ? 'khata.pin.confirmTitle' : 'khata.pin.setTitle'));

  constructor() {
    effect(() => this.seo.set({ title: this.title(), description: this.i18n.t('seo.khata.desc'), path: '/khata/', image: 'default', lang: this.i18n.lang(), noindex: true }));

    // Unlocked in another tab: this tab follows.
    effect(() => {
      if (this.mode === 'unlock' && this.session.unlocked())
        this.goOn();
    });
  }

  // #region Public Methods

  async logout(): Promise<void> {
    await this.session.logout();
  }

  /** A forgotten PIN needs a fresh login; right after it the API allows a new PIN and logs out every other device. */
  async forgot(): Promise<void> {
    await this.session.logout();
    void this.router.navigate(['/khata/login'], { queryParams: { reset: 1 } });
  }

  async submit(): Promise<void> {
    const pin = this.pin();
    if (this.busy() || pin.length < MIN_PIN)
      return;
    this.error.set('');
    if (this.mode === 'set' && !this.first()) {
      this.first.set(pin);
      this.pin.set('');
      return;
    }
    if (this.mode === 'set' && this.first() !== pin) {
      this.first.set(null);
      this.pin.set('');
      this.error.set(this.i18n.t('khata.pin.mismatch'));
      return;
    }
    await this.send(pin);
  }

  // #endregion

  // #region Private Methods

  private goOn(): void {
    const next = this.route.snapshot.queryParamMap.get('next');
    void this.router.navigateByUrl(next?.startsWith('/khata/app') ? next : '/khata/app');
  }

  private async send(pin: string): Promise<void> {
    this.busy.set(true);
    try {
      await (this.mode === 'set' ? this.session.setPin(pin) : this.session.unlock(pin));
      this.goOn();
    } catch (e) {
      this.first.set(null);
      this.error.set((e as Error).message);
    } finally {
      this.pin.set('');
      this.busy.set(false);
    }
  }

  // #endregion
}
