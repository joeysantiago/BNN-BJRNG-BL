import { Lang } from '../../../core/site';
import { Router, RouterLink } from '@angular/router';
import { KhataIcon } from '../ui/khata-icon/khata-icon';
import { AuthService } from '../../../core/auth.service';
import { I18nService } from '../../../core/i18n.service';
import { UserAvatar } from '../../../shared/user-avatar';
import { InstallService } from '../../../core/install.service';
import { KhataUiService } from '../../../core/khata-ui.service';
import { ProfileDetails } from '../../../core/models/auth.model';
import { KhataStateService } from '../../../core/khata-state.service';
import { formatDate, formatDateTimeWithZone } from '../../../core/date-format';
import { KhataNotice, KhataProfileForm } from '../../../core/models/khata.model';
import { Component, WritableSignal, afterNextRender, computed, effect, inject, signal } from '@angular/core';

const DETAIL_FIELDS: (keyof ProfileDetails)[] = ['mobile', 'addressLine1', 'addressLine2', 'city', 'state', 'postalCode', 'country', 'companyName', 'companyTaxId', 'companyEmail', 'companyPhone', 'companyAddress'];

/**
 * /khata/app/profile: the account, laid out like the site's profile page. Picture, name, role, member since and last login; name and language;
 * mobile number, address and company (used on exported PDFs); the password (not for a session that logged in with a one-time code); install; log out.
 */
@Component({
  selector: 'app-khata-profile',
  templateUrl: './khata-profile.html',
  styleUrl: './khata-profile.scss',
  imports: [RouterLink, KhataIcon, UserAvatar],
})

export class KhataProfile {
  protected readonly show = signal(false);
  private readonly router = inject(Router);
  protected readonly iosHelp = signal(false);
  private readonly ui = inject(KhataUiService);
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  private readonly state = inject(KhataStateService);
  protected readonly loaded = signal<boolean>(false);
  protected readonly install = inject(InstallService);
  protected readonly pwNotice = signal<KhataNotice | null>(null);
  protected readonly details = signal<ProfileDetails | null>(null);
  protected readonly infoNotice = signal<KhataNotice | null>(null);
  protected readonly photoNotice = signal<KhataNotice | null>(null);
  protected readonly saving = signal<KhataProfileForm | null>(null);
  protected readonly addressNotice = signal<KhataNotice | null>(null);
  protected readonly since = computed(() => formatDate(this.auth.user()?.createdOn));
  protected readonly byCode = computed(() => this.auth.user()?.loginMethod === 'otp');
  protected readonly lastLogin = computed(() => formatDateTimeWithZone(this.auth.user()?.lastLoginOn));

  constructor() {
    effect(() => this.state.screen(this.i18n.t('khata.p.title')));
    afterNextRender(() => void this.loadDetails());
  }

  // #region Public Methods

  async logout(): Promise<void> {
    if (!(await this.ui.confirm(this.i18n.t('khata.p.logoutTitle'))))
      return;
    await this.auth.logout();
    void this.router.navigateByUrl('/khata', { replaceUrl: true });
  }

  async removePhoto(): Promise<void> {
    await this.run('photo', this.photoNotice, () => this.auth.removeAvatar());
  }

  /** Saves the display name and language; the language is applied at once. */
  async saveInfo(form: HTMLFormElement): Promise<void> {
    const data = new FormData(form);
    const name = String(data.get('displayName') ?? '').trim();
    const lang = String(data.get('language') ?? 'en') as Lang;
    await this.run('details', this.infoNotice, async () => {
      const text = await this.auth.updateProfile(name, lang);
      this.i18n.set(lang);
      return text;
    });
  }

  /** Uploads the chosen picture at once; the server checks its type and size. */
  async pickPhoto(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    if (!file)
      return;
    await this.run('photo', this.photoNotice, () => this.auth.uploadAvatar(file));
    input.value = '';
  }

  /** Saves the mobile number, address and company in one go. */
  async saveAddress(form: HTMLFormElement): Promise<void> {
    const data = new FormData(form);
    const details = Object.fromEntries(DETAIL_FIELDS.map((f) => [f, String(data.get(f) ?? '').trim() || null])) as unknown as ProfileDetails;
    await this.run('address', this.addressNotice, async () => {
      const text = await this.auth.saveDetails(details);
      this.details.set({ ...details, limits: this.details()?.limits });
      return text;
    });
  }

  /** Changes the password with the current one. The server logs out every other session of this account. */
  async changePassword(form: HTMLFormElement): Promise<void> {
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

  private async loadDetails(): Promise<void> {
    try {
      this.details.set(await this.auth.details());
    } catch (e) {
      this.addressNotice.set({ text: (e as Error).message, error: true });
    } finally {
      this.loaded.set(true);
    }
  }

  private async run(form: KhataProfileForm, notice: WritableSignal<KhataNotice | null>, work: () => Promise<string>): Promise<void> {
    if (this.saving())
      return;
    this.saving.set(form);
    notice.set(null);
    try {
      notice.set({ text: await work(), error: false });
    } catch (e) {
      notice.set({ text: (e as { status?: number }).status !== undefined ? (e as Error).message : this.i18n.t('auth.serverDown'), error: true });
    } finally {
      this.saving.set(null);
    }
  }

  // #endregion
}
