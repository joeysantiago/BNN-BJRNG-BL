import { Lang } from '../../core/site';
import { SeoService } from '../../core/seo.service';
import { APP_LINKS, appLink } from '../../core/apps';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n.service';
import { UserAvatar } from '../../shared/user-avatar';
import { ProfileForm, ProfileNotice } from './profile.model';
import { formatDate, formatDateTimeWithZone } from '../../core/date-format';
import { Component, WritableSignal, computed, effect, inject, signal } from '@angular/core';

/**
 * /profile: every logged-in user's account page, laid out side by side so it fits one screen on a desktop: the profile card (picture, name, role, member since,
 * last login, apps), name and language with the apps this account may open, and the password. Prerendered as an empty shell; the guard asks for the login in the browser.
 */
@Component({
  selector: 'app-profile',
  imports: [RouterLink, UserAvatar],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})

export class Profile {
  protected readonly show = signal(false);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  protected readonly saving = signal<ProfileForm | null>(null);
  protected readonly pwNotice = signal<ProfileNotice | null>(null);
  protected readonly infoNotice = signal<ProfileNotice | null>(null);
  protected readonly photoNotice = signal<ProfileNotice | null>(null);
  protected readonly since = computed(() => formatDate(this.auth.user()?.createdOn));
  protected readonly lastLogin = computed(() => formatDateTimeWithZone(this.auth.user()?.lastLoginOn));
  /** A feature branch may not have every app's pages: an app whose page is not routed here is listed without a link. */
  protected readonly apps = computed(() => (this.auth.isAdmin() ? APP_LINKS : this.auth.apps().map(appLink)).map((a) => (a.path && this.router.config.some((r) => r.path === a.path!.split('/')[1]) ? a : { ...a, path: null })));

  constructor() {
    effect(() => {
      this.seo.set({
        title: this.i18n.t('seo.profile.title'),
        description: this.i18n.t('seo.profile.desc'),
        path: '/profile/',
        image: 'default',
        lang: this.i18n.lang(),
        // A private page of each account, not a page to find in search results.
        noindex: true,
      });
    });
  }

  // #region Public Methods

  async logout(): Promise<void> {
    await this.auth.logout();
  }

  async removePhoto(): Promise<void> {
    await this.run('photo', this.photoNotice, () => this.auth.removeAvatar());
  }

  /** Uploads the chosen picture at once; the server checks its type and size. */
  async pickPhoto(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file)
      return;
    await this.run('photo', this.photoNotice, () => this.auth.uploadAvatar(file));
    input.value = '';
  }

  /** Saves the display name and language; the chosen language is applied to the site at once. */
  async saveDetails(ev: Event): Promise<void> {
    ev.preventDefault();
    const data = new FormData(ev.target as HTMLFormElement);
    const name = String(data.get('displayName') ?? '').trim();
    const lang = String(data.get('language') ?? 'en') as Lang;
    await this.run('details', this.infoNotice, async () => {
      const text = await this.auth.updateProfile(name, lang);
      this.i18n.set(lang);
      return text;
    });
  }

  /** Changes the password with the current one. Every other session of this account is logged out by the server. */
  async changePassword(ev: Event): Promise<void> {
    ev.preventDefault();
    const form = ev.target as HTMLFormElement;
    const data = new FormData(form);
    const current = String(data.get('currentPassword') ?? '');
    const next = String(data.get('newPassword') ?? '');
    await this.run('password', this.pwNotice, async () => {
      const text = await this.auth.changePassword(current, next);
      form.reset();
      return text;
    });
  }

  // #endregion

  // #region Private Methods

  /** The server's own message when it answered; "server unreachable" when it did not. */
  private failureText(e: unknown): string {
    return (e as { status?: number }).status !== undefined ? (e as Error).message : this.i18n.t('auth.serverDown');
  }

  private async run(target: ProfileForm, notice: WritableSignal<ProfileNotice | null>, work: () => Promise<string>): Promise<void> {
    if (this.saving())
      return;
    this.saving.set(target);
    notice.set(null);
    try {
      notice.set({ text: await work(), error: false });
    } catch (e) {
      notice.set({ text: this.failureText(e), error: true });
    } finally {
      this.saving.set(null);
    }
  }

  // #endregion
}
