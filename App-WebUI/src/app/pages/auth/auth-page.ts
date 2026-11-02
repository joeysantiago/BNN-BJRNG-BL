import { AuthMode } from './auth-page.model';
import { SeoService } from '../../core/seo.service';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n.service';
import { DevLogin } from '../../core/models/auth.model';
import { environment } from '../../../environments/environment';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Component, afterNextRender, effect, inject, signal } from '@angular/core';

/** Only addresses of this site are followed after the login, never another site (an open redirect). */
const safeNext = (value: string | null): string | null => (value && value.startsWith('/') && !value.startsWith('//') && !/^\/(login|signup)\b/.test(value) ? value : null);

/**
 * /login and /signup: the common login of every app. The server's messages (wrong password, e-mail taken, locked, too many tries) are shown as they are.
 * After success the visitor goes back to `next` (the page that asked for the login) or to the profile.
 */
@Component({
  selector: 'app-auth-page',
  imports: [RouterLink],
  templateUrl: './auth-page.html',
  styleUrl: './auth-page.scss',
})

export class AuthPage {
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  protected readonly show = signal(false);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute);
  /** Development builds only: the seeded logins, the first pre-filled. Empty in QA, UAT and live. */
  protected readonly devLogins: DevLogin[] = environment.devLogins;
  protected readonly next = safeNext(this.route.snapshot.queryParamMap.get('next'));
  protected readonly mode: AuthMode = this.route.snapshot.data['mode'] === 'signup' ? 'signup' : 'login';

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

  private async skipWhenLoggedIn(): Promise<void> {
    if (await this.auth.ensureSession())
      this.go();
  }

  // #endregion
}
