import { SeoService } from '../../core/seo.service';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n.service';
import { ToastService } from '../../core/toast.service';
import { ChoiceGroup } from '../../shared/choice-group';
import { SettingsService } from '../../core/settings.service';
import { environment } from '../../../environments/environment';
import { ChoiceOption } from '../../shared/models/choice.model';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OtpChannel, QuickLogin } from '../../core/models/auth.model';
import { AuthMode, LoginWay, OtpStep, SignupDetails, SignupStep } from './auth-page.model';
import { Component, OnDestroy, afterNextRender, computed, effect, inject, signal } from '@angular/core';

/** The apps that also offer a one-time code login, by the start of the address they open. */
/** The line icons of the two ways to log in (fixed drawings). */
const LOCK_ICON = ['M6 11h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z', 'M8 11V7a4 4 0 0 1 8 0v4'];
const PHONE_ICON = ['M8.5 2h7A2.5 2.5 0 0 1 18 4.5v15a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 6 19.5v-15A2.5 2.5 0 0 1 8.5 2z', 'M11 18h2'];

const OTP_APPS: Record<string, string> = { '/khata': 'khata', '/tracker': 'tracker', '/tasks': 'tasks' };

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
  imports: [RouterLink, ChoiceGroup],
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
  private readonly toast = inject(ToastService);
  protected readonly i18n = inject(I18nService);
  private readonly cfg = inject(SettingsService);
  private readonly route = inject(ActivatedRoute);
  protected readonly step = signal<OtpStep>('ask');
  protected readonly way = signal<LoginWay>('password');
  protected readonly channel = signal<OtpChannel>('email');
  private timer: ReturnType<typeof setInterval> | undefined;
  /** The users a super admin shows on the login page (Settings > General): e-mails only, a tap logs in as them on the server. */
  protected readonly quickLogins = signal<QuickLogin[]>([]);
  private readonly signup = signal<SignupDetails | null>(null);
  protected readonly signupStep = signal<SignupStep>('details');
  protected readonly next = safeNext(this.route.snapshot.queryParamMap.get('next'));
  /** WhatsApp or SMS sign-up codes go to a mobile number, so the sign-up asks for it. */
  protected readonly needsMobile = computed(() => this.cfg.settings().signupVerification !== 'email');
  protected readonly mode: AuthMode = this.route.snapshot.data['mode'] === 'signup' ? 'signup' : 'login';
  /** Password or one-time code, offered on every login page. */
  protected readonly ways = computed<ChoiceOption[]>(() => [{ value: 'password', label: this.i18n.t('auth.otp.byPassword'), icon: LOCK_ICON }, { value: 'otp', label: this.i18n.t('auth.otp.byCode'), icon: PHONE_ICON }]);
  /** The app the code login is for: from ?app= or from the address the login returns to, otherwise the first app that allows it (the session opens only those apps). */
  protected readonly otpApp: string = Object.values(OTP_APPS).find((a) => a === this.route.snapshot.queryParamMap.get('app')) ?? Object.entries(OTP_APPS).find(([path]) => this.next?.startsWith(path))?.[1] ?? Object.values(OTP_APPS)[0];

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
    afterNextRender(() => {
      void this.skipWhenLoggedIn();
      if (this.mode === 'login')
        void this.loadQuickLogins();
    });
  }

  // #region Public Methods

  /** Back to the sign-up details (to change the e-mail address or the mobile number). */
  editSignup(): void {
    this.signupStep.set('details');
    this.error.set('');
    this.info.set('');
  }

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

  /** Sends (or sends again) the code that checks the sign-up. */
  async sendSignupCode(): Promise<void> {
    const pending = this.signup();
    if (!pending || this.resendIn() > 0)
      return;
    await this.attempt(async () => {
      const result = await this.auth.signupCode(pending.email, pending.mobile);
      this.signupStep.set('code');
      this.info.set(result.message ?? '');
      this.countdown(result.resendInSeconds);
    });
  }

  /**
   * Reads the form before the fields are disabled (disabled fields are not part of the form data). A login logs in; a sign-up first sends the code that checks the
   * address (an address of a disposable mail domain is refused before), then makes the account with that code.
   */
  async submit(ev: Event): Promise<void> {
    ev.preventDefault();
    if (this.busy())
      return;
    const data = new FormData(ev.target as HTMLFormElement);
    const text = (name: string): string => String(data.get(name) ?? '').trim();
    if (this.mode === 'login') {
      await this.attempt(async () => {
        await this.auth.login(text('email'), String(data.get('password') ?? ''));
        this.go();
      });
      return;
    }
    const pending = this.signup();
    if (this.signupStep() === 'code' && pending) {
      await this.attempt(async () => {
        await this.auth.register(pending.email, pending.password, pending.name, pending.mobile, text('code'));
        this.go();
      });
      return;
    }
    const details = { name: text('displayName'), email: text('email'), password: String(data.get('password') ?? ''), mobile: this.needsMobile() ? text('mobile') || null : null };
    if (this.blocked(details.email)) {
      this.info.set('');
      this.error.set(this.i18n.t('auth.signup.blocked'));
      return;
    }
    this.signup.set(details);
    await this.sendSignupCode();
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

  /** Logs in as one of the quick login users; the session is started by the server. */
  async useLogin(login: QuickLogin): Promise<void> {
    if (this.busy())
      return;
    await this.attempt(async () => {
      await this.auth.quickLogin(login.id);
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
      const result = await this.noAccount(() => this.auth.otpRequest(this.channel(), to, app));
      if (!result)
        return;
      this.destination.set(to);
      this.step.set('code');
      // The server's own answer when it gives one (the demo backend shows the code there, as Mojito sends no message).
      this.info.set(result.message || this.i18n.t(this.channel() === 'email' ? 'auth.otp.sentEmail' : 'auth.otp.sentSms', { to }));
      this.countdown(result.resendInSeconds);
    });
  }

  // #endregion

  // #region Private Methods

  private go(): void {
    void this.router.navigateByUrl(this.next ?? '/profile', { replaceUrl: true });
  }

  /** An address of a disposable mail domain (environment.blockedEmailDomains); the API refuses the same. */
  private blocked(email: string): boolean {
    const domain = email.slice(email.lastIndexOf('@') + 1).toLowerCase();
    return environment.blockedEmailDomains.includes(domain);
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

  private async loadQuickLogins(): Promise<void> {
    this.quickLogins.set(await this.auth.quickLogins());
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

  /** A code login for an address without an account: the server's "no account" answer as a toast with a link to the sign-up, and no code is sent. */
  private async noAccount<T>(work: () => Promise<T>): Promise<T | null> {
    try {
      return await work();
    } catch (e) {
      if ((e as { status?: number }).status !== 404)
        throw e;
      this.toast.show((e as Error).message, true, { path: '/signup', label: this.i18n.t('auth.toSignup'), query: this.next ? { next: this.next } : undefined });
      return null;
    }
  }

  // #endregion
}
