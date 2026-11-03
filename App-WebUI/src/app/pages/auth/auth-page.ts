import { SeoService } from '../../core/seo.service';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n.service';
import { environment } from '../../../environments/environment';
import { AuthMode, LoginWay, OtpStep } from './auth-page.model';
import { DevLogin, OtpChannel } from '../../core/models/auth.model';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Component, OnDestroy, afterNextRender, effect, inject, signal } from '@angular/core';

/** The apps that also offer a one-time code login, by the start of the address they open. */
const OTP_APPS: Record<string, string> = { '/khata': 'khata', '/tracker': 'tracker' };

/** Where a code goes, from what was typed: an e-mail address or a mobile number (digits, optional +, spaces or dashes); null = neither. */
const channelOf = (to: string): OtpChannel | null => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) ? 'email' : /^\+?[\d\s-]{7,16}$/.test(to) ? 'sms' : null);

/** Only addresses of this site are followed after the login, never another site (an open redirect). */
const safeNext = (value: string | null): string | null => (value && value.startsWith('/') && !value.startsWith('//') && !/^\/(login|signup)\b/.test(value) ? value : null);

/**
 * /login and /signup: the common login of every app. The server's messages (wrong password, e-mail taken, locked, too many tries) are shown as they are.
 * After success the visitor goes back to `next` (the page that asked for the login) or to the profile.
 * For SnapKhata and SnapTracker (next=/khata…, /tracker… or ?app=) the login can also be a one-time code sent by e-mail or SMS: the same account
 * and session, limited by the server to those apps.
 */
@Component({
  selector: 'app-auth-page',
  imports: [RouterLink],
  templateUrl: './auth-page.html',
  styleUrl: './auth-page.scss',
})

export class AuthPage implements OnDestroy {
  protected readonly info = signal('');
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  protected readonly resendIn = signal(0);
  protected readonly show = signal(false);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly auth = inject(AuthService);
  protected readonly destination = signal('');
  protected readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute);
  protected readonly step = signal<OtpStep>('ask');
  protected readonly way = signal<LoginWay>('password');
  protected readonly channel = signal<OtpChannel>('email');
  private timer: ReturnType<typeof setInterval> | undefined;
  /** Development builds only: the seeded logins, the first pre-filled. Empty in QA, UAT and live. */
  protected readonly devLogins: DevLogin[] = environment.devLogins;
  protected readonly next = safeNext(this.route.snapshot.queryParamMap.get('next'));
  protected readonly mode: AuthMode = this.route.snapshot.data['mode'] === 'signup' ? 'signup' : 'login';
  /** The app that allows a code login here, from ?app= or from the address the login returns to; null = password only. */
  protected readonly otpApp: string | null = Object.values(OTP_APPS).find((a) => a === this.route.snapshot.queryParamMap.get('app')) ?? Object.entries(OTP_APPS).find(([path]) => this.next?.startsWith(path))?.[1] ?? null;

  constructor() {
    effect(() => {
      this.seo.set({
        title: this.i18n.t(this.mode === 'signup' ? 'seo.signup.title' : 'seo.login.title'),
        description: this.i18n.t(this.mode === 'signup' ? 'seo.signup.desc' : 'seo.login.desc'),
        path: `/${this.mode}/`,
        image: 'default',
        lang: this.i18n.lang(),
      });
    });

    // Already logged in (this tab, another tab or the refresh cookie): no need to log in again.
    afterNextRender(() => void this.skipWhenLoggedIn());
  }

  // #region Public Methods

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  /** Back to the first step, to change the e-mail or number. */
  changeDestination(): void {
    this.step.set('ask');
    this.error.set('');
    this.info.set('');
  }

  setWay(way: LoginWay): void {
    this.way.set(way);
    this.error.set('');
    this.info.set('');
  }

  /** Reads the form before the fields are disabled (disabled fields are not part of the form data). */
  async submit(ev: Event): Promise<void> {
    ev.preventDefault();
    if (this.busy())
      return;
    const data = new FormData(ev.target as HTMLFormElement);
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');
    const name = String(data.get('displayName') ?? '').trim();
    this.busy.set(true);
    this.error.set('');
    try {
      await (this.mode === 'signup' ? this.auth.register(email, password, name) : this.auth.login(email, password));
      this.go();
    } catch (e) {
      this.error.set((e as { status?: number }).status !== undefined ? (e as Error).message : this.i18n.t('auth.serverDown'));
    } finally {
      this.busy.set(false);
    }
  }

  async verifyCode(code: string): Promise<void> {
    const app = this.otpApp;
    if (!app || !code.trim() || this.busy())
      return;
    await this.attempt(async () => {
      await this.auth.otpVerify(this.channel(), this.destination(), code.trim(), app);
      this.go();
    });
  }

  /** Sends (or sends again) the one-time code. One field: an e-mail address gets the code by e-mail, a mobile number by SMS. */
  async sendCode(destination: string): Promise<void> {
    const app = this.otpApp;
    const to = destination.trim();
    if (!app || !to || this.busy() || this.resendIn() > 0)
      return;
    const channel = channelOf(to);
    if (!channel) {
      this.info.set('');
      this.error.set(this.i18n.t('auth.otp.invalidTo'));
      return;
    }
    this.channel.set(channel);
    await this.attempt(async () => {
      const result = await this.auth.otpRequest(this.channel(), to, app);
      this.destination.set(to);
      this.step.set('code');
      this.info.set(this.i18n.t(this.channel() === 'email' ? 'auth.otp.sentEmail' : 'auth.otp.sentSms', { to }));
      this.countdown(result.resendInSeconds);
    });
  }

  /** Fills the form with one of the seeded development logins. */
  useLogin(login: DevLogin, email: HTMLInputElement, password: HTMLInputElement): void {
    email.value = login.email;
    password.value = login.password;
  }

  // #endregion

  // #region Private Methods

  private go(): void {
    void this.router.navigateByUrl(this.next ?? '/profile', { replaceUrl: true });
  }

  private countdown(seconds: number): void {
    clearInterval(this.timer);
    this.resendIn.set(seconds);
    this.timer = setInterval(() => {
      this.resendIn.update((s) => Math.max(0, s - 1));
      if (!this.resendIn())
        clearInterval(this.timer);
    }, 1000);
  }

  private async skipWhenLoggedIn(): Promise<void> {
    if (await this.auth.ensureSession())
      this.go();
  }

  private async attempt(work: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await work();
    } catch (e) {
      this.info.set('');
      this.error.set((e as { status?: number }).status !== undefined ? (e as Error).message : this.i18n.t('auth.serverDown'));
    } finally {
      this.busy.set(false);
    }
  }

  // #endregion
}
