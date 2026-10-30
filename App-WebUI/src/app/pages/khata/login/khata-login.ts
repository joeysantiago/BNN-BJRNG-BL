import { SeoService } from '../../../core/seo.service';
import { I18nService } from '../../../core/i18n.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { KhataSessionService } from '../../../core/khata-session.service';
import { Component, DestroyRef, effect, inject, signal } from '@angular/core';

const RESEND_SECONDS = 45;

/** /khata/login: email or mobile number, then the 6-digit code. Locally the code is printed in the API console (development sender). */
@Component({
  selector: 'app-khata-login',
  imports: [RouterLink],
  templateUrl: './khata-login.html',
  styleUrl: './khata-login.scss',
})

export class KhataLogin {
  protected readonly wait = signal(0);
  protected readonly info = signal('');
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  protected readonly identifier = signal('');
  protected readonly codeSent = signal(false);
  protected readonly i18n = inject(I18nService);
  private timer?: ReturnType<typeof setInterval>;
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly session = inject(KhataSessionService);

  /** Development only: the code the API returned, filled into the code field. */
  protected readonly devCode = signal<string | null>(null);

  constructor() {
    effect(() => this.seo.set({ title: this.i18n.t('khata.login.title'), description: this.i18n.t('seo.khata.desc'), path: '/khata/', image: 'default', lang: this.i18n.lang(), noindex: true }));
    this.destroyRef.onDestroy(() => clearInterval(this.timer));
  }

  // #region Public Methods

  change(): void {
    this.codeSent.set(false);
    this.devCode.set(null);
    this.error.set('');
    this.info.set('');
  }

  async send(value: string): Promise<void> {
    if (this.busy() || this.wait() > 0 || !value.trim())
      return;
    await this.run(async () => {
      const sent = await this.session.sendOtp(value.trim());
      this.info.set(sent.message);
      this.devCode.set(sent.devCode);
      this.identifier.set(value.trim());
      this.codeSent.set(true);
      this.startWait();
    });
  }

  async verify(code: string): Promise<void> {
    if (this.busy() || !/^\d{6}$/.test(code.trim()))
      return this.error.set(this.i18n.t('khata.login.codeInvalid'));
    await this.run(async () => {
      await this.session.verifyOtp(this.identifier(), code.trim());
      const reset = this.route.snapshot.queryParamMap.has('reset');
      void this.router.navigateByUrl(!this.session.hasPin() || reset ? '/khata/set-pin' : '/khata/unlock');
    });
  }

  // #endregion

  // #region Private Methods

  private startWait(): void {
    clearInterval(this.timer);
    this.wait.set(RESEND_SECONDS);
    this.timer = setInterval(() => {
      this.wait.update((s) => Math.max(0, s - 1));
      if (!this.wait())
        clearInterval(this.timer);
    }, 1000);
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

  // #endregion
}
