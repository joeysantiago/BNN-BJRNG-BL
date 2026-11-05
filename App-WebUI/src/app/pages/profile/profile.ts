import { Lang } from '../../core/site';
import { SeoService } from '../../core/seo.service';
import { NgComponentOutlet } from '@angular/common';
import { APP_LINKS, appLink } from '../../core/apps';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n.service';
import { UserAvatar } from '../../shared/user-avatar';
import { FEATURE_PROFILE } from '../../feature-routes';
import { ProfileDetails } from '../../core/models/auth.model';
import { DetailField, ProfileForm, ProfileNotice } from './profile.model';
import { formatDate, formatDateTimeWithZone } from '../../core/date-format';
import { Component, Type, WritableSignal, afterNextRender, computed, effect, inject, signal } from '@angular/core';

/** The contact fields, then the company fields of the details form (also used on exported PDFs). */
const PERSONAL: DetailField[] = [
  { name: 'mobile', label: 'auth.p.mobile', type: 'tel', autocomplete: 'tel', limit: 'mobileLength' },
  { name: 'addressLine1', label: 'auth.p.line1', type: 'text', autocomplete: 'address-line1', limit: 'addressLength' },
  { name: 'addressLine2', label: 'auth.p.line2', type: 'text', autocomplete: 'address-line2', limit: 'addressLength' },
  { name: 'city', label: 'auth.p.city', type: 'text', autocomplete: 'address-level2', limit: 'cityLength' },
  { name: 'state', label: 'auth.p.state', type: 'text', autocomplete: 'address-level1', limit: 'stateLength' },
  { name: 'postalCode', label: 'auth.p.postalCode', type: 'text', autocomplete: 'postal-code', limit: 'postalCodeLength' },
  { name: 'country', label: 'auth.p.country', type: 'text', autocomplete: 'country-name', limit: 'countryLength' },
];
const COMPANY: DetailField[] = [
  { name: 'companyName', label: 'auth.p.companyName', type: 'text', autocomplete: 'organization', limit: 'companyNameLength' },
  { name: 'companyTaxId', label: 'auth.p.companyTaxId', type: 'text', autocomplete: 'off', limit: 'companyTaxIdLength' },
  { name: 'companyEmail', label: 'auth.p.companyEmail', type: 'email', autocomplete: 'off', limit: 'companyEmailLength' },
  { name: 'companyPhone', label: 'auth.p.companyPhone', type: 'tel', autocomplete: 'off', limit: 'companyPhoneLength' },
  { name: 'companyAddress', label: 'auth.p.companyAddress', type: 'text', autocomplete: 'off', limit: 'companyAddressLength' },
];

/**
 * /profile: every logged-in user's account page, laid out side by side so it fits one screen on a desktop: the profile card (picture, name, role, member since,
 * last login, how they logged in, apps), name and language with the apps this account may open, the contact and company details (shown on exported PDFs), the password
 * (not for a session that logged in with a one-time code), the parts the user's apps bring (FEATURE_PROFILE) and deleting the account. Prerendered as an empty shell; the guard asks for the login in the browser.
 */
@Component({
  selector: 'app-profile',
  imports: [RouterLink, UserAvatar, NgComponentOutlet],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})

export class Profile {
  protected readonly company = COMPANY;
  protected readonly personal = PERSONAL;
  protected readonly show = signal(false);
  /** Delete was pressed once and now asks again. */
  protected readonly sure = signal(false);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  protected readonly panels = signal<Type<unknown>[]>([]);
  protected readonly saving = signal<ProfileForm | null>(null);
  protected readonly details = signal<ProfileDetails | null>(null);
  protected readonly pwNotice = signal<ProfileNotice | null>(null);
  protected readonly infoNotice = signal<ProfileNotice | null>(null);
  protected readonly photoNotice = signal<ProfileNotice | null>(null);
  protected readonly deleteNotice = signal<ProfileNotice | null>(null);
  protected readonly addressNotice = signal<ProfileNotice | null>(null);
  protected readonly since = computed(() => formatDate(this.auth.user()?.createdOn));
  protected readonly byCode = computed(() => this.auth.user()?.loginMethod === 'otp');
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

    afterNextRender(() => {
      void this.loadDetails();
      void this.loadPanels();
    });
  }

  // #region Public Methods

  async logout(): Promise<void> {
    await this.auth.logout();
  }

  async removePhoto(): Promise<void> {
    await this.run('photo', this.photoNotice, () => this.auth.removeAvatar());
  }

  /** First press asks again; the second deletes the account (the server logs out every device, and the e-mail can no longer log in). A refusal stays on the page. */
  async deleteAccount(): Promise<void> {
    if (!this.sure()) {
      this.sure.set(true);
      return;
    }
    this.sure.set(false);
    await this.run('delete', this.deleteNotice, async () => {
      const text = await this.auth.deleteAccount();
      void this.router.navigateByUrl('/', { replaceUrl: true });
      return text;
    });
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

  /** Saves the mobile number, address and company in one go; an empty field is cleared. */
  async saveAddress(ev: Event): Promise<void> {
    ev.preventDefault();
    const data = new FormData(ev.target as HTMLFormElement);
    const details = Object.fromEntries([...PERSONAL, ...COMPANY].map((f) => [f.name, String(data.get(f.name) ?? '').trim() || null])) as unknown as ProfileDetails;
    await this.run('address', this.addressNotice, async () => {
      const text = await this.auth.saveDetails(details);
      this.details.set({ ...details, limits: this.details()?.limits });
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

  /** Loads the profile parts of the apps this account may open (the guard has restored the login before this page opens). */
  private async loadPanels(): Promise<void> {
    const own = FEATURE_PROFILE.filter((p) => this.auth.hasApp(p.app)).sort((a, b) => a.order - b.order);
    this.panels.set(await Promise.all(own.map((p) => p.load())));
  }

  private async loadDetails(): Promise<void> {
    try {
      this.details.set(await this.auth.details());
    } catch (e) {
      this.addressNotice.set({ text: this.failureText(e), error: true });
    }
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
