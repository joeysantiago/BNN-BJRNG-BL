import { Lang } from '../../../core/site';
import { FEATURE_APPS } from '../../../feature-routes';
import { AuthService } from '../../../core/auth.service';
import { I18nService } from '../../../core/i18n.service';
import { ThemeService } from '../../../core/theme.service';
import { ChoiceGroup } from '../../../shared/choice-group';
import { SettingsService } from '../../../core/settings.service';
import { Skin, ThemeMode } from '../../../core/models/theme.model';
import { ChoiceOption } from '../../../shared/models/choice.model';
import { Component, computed, inject, signal } from '@angular/core';
import { AccountForm, AccountNotice, OwnGroup } from './account-tab.model';
import { FEATURES, FEATURE_GROUPS, featureBuilt } from '../../../core/features';
import { FeatureId, FeatureGroup } from '../../../core/models/app-settings.model';

/** The groups a user may switch off for themselves, and the apps that make them their own (none = every user). Same rule as the API (AuthService.OwnFeatureApps). */
const OWN_GROUP_APPS: Partial<Record<FeatureGroup, string[]>> = { site: [], speed: [], youtube: ['youtube'], audio: ['creta', 'nexon'] };

/**
 * The For me tab of the Settings page, for every user whose role may view it (the Standard User sees only this tab): the language, the skin, the password,
 * and which options of their own pages (the header, the speed test and the apps they can open) are shown to them. A switched-off option is hidden only for this user.
 */
@Component({
  selector: 'app-account-tab',
  imports: [ChoiceGroup],
  templateUrl: './account-tab.html',
  styleUrl: './account-tab.scss',
})

export class AccountTab {
  protected readonly show = signal(false);
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  private readonly cfg = inject(SettingsService);
  protected readonly theme = inject(ThemeService);
  protected readonly saving = signal<AccountForm | null>(null);
  protected readonly notice = signal<AccountNotice | null>(null);
  /** The options the user switched off, starting from what they saved last. Each switch saves at once. */
  protected readonly hidden = signal<string[]>(this.auth.user()?.hiddenFeatures ?? []);
  protected readonly canEdit = computed(() => this.auth.can('settings.account', 'edit'));
  protected readonly groups = computed<OwnGroup[]>(() => FEATURE_GROUPS.filter((g) => this.isOwn(g.id) && featureBuilt(g.id, FEATURE_APPS)).map((g) => ({ id: g.id, label: g.label, items: FEATURES.filter((f) => f.group === g.id && featureBuilt(f.id, FEATURE_APPS)) })).filter((g) => g.items.length));

  protected readonly languages = computed<ChoiceOption[]>(() => this.i18n.languages.map((l) => ({ value: l.code, label: l.native })));
  protected readonly modes = computed<ChoiceOption[]>(() => this.theme.modes.map((m) => ({ value: m.id, label: this.i18n.t(m.labelKey) })));
  protected readonly skins = computed<ChoiceOption[]>(() => this.theme.skins.map((s) => ({ value: s.id, label: this.i18n.t(s.labelKey) })));

  // #region Public Methods

  pickMode(mode: string): void {
    this.theme.setMode(mode as ThemeMode);
  }

  pickSkin(skin: string): void {
    this.theme.set(skin as Skin);
  }

  /** On for the site and not switched off by the user. */
  shown(id: FeatureId): boolean {
    return !this.hidden().includes(id);
  }

  /** Switched off for the whole site: the user cannot turn it on for themselves. */
  siteOff(id: FeatureId): boolean {
    return !this.cfg.settings().features[id];
  }

  /** Changes the password with the current one. Every other session of this account is logged out by the server. */
  async changePassword(ev: Event): Promise<void> {
    ev.preventDefault();
    const form = ev.target as HTMLFormElement;
    const data = new FormData(form);
    const current = String(data.get('currentPassword') ?? '');
    const next = String(data.get('newPassword') ?? '');
    await this.run('password', async () => {
      const text = await this.auth.changePassword(current, next);
      form.reset();
      return text;
    });
  }

  /** Saves the language of the account as soon as it is picked and applies it to the site. */
  async saveLanguage(code: string): Promise<void> {
    const user = this.auth.user();
    const lang = code as Lang;
    if (!user)
      return;
    await this.run('language', async () => {
      const text = await this.auth.updateProfile(user.displayName, lang);
      this.i18n.set(lang);
      return text;
    });
  }

  noticeFor(form: AccountForm): AccountNotice | null {
    const n = this.notice();
    return n?.form === form ? n : null;
  }

  /** One switch saves at once. The server accepts only the options of their own pages; when it refuses, the switch goes back. */
  async toggle(id: FeatureId, ev: Event): Promise<void> {
    const box = ev.target as HTMLInputElement;
    const before = this.hidden();
    this.hidden.set(box.checked ? before.filter((c) => c !== id) : [...before, id]);
    await this.run('features', () => this.auth.updateFeatures(this.hidden()));
    if (this.notice()?.error) {
      this.hidden.set(before);
      box.checked = !box.checked;
    }
  }

  // #endregion

  // #region Private Methods

  /** The server's own message when it answered; "server unreachable" when it did not. */
  private failureText(e: unknown): string {
    return (e as { status?: number }).status !== undefined ? (e as Error).message : this.i18n.t('auth.serverDown');
  }

  /** A group of the header and the speed test belongs to everyone; an app's group only to users who can open that app (administrators open every app). */
  private isOwn(group: FeatureGroup): boolean {
    const apps = OWN_GROUP_APPS[group];
    return apps !== undefined && (apps.length === 0 || apps.some((a) => this.auth.hasApp(a)));
  }

  private async run(form: AccountForm, work: () => Promise<string>): Promise<void> {
    if (this.saving())
      return;
    this.saving.set(form);
    this.notice.set(null);
    try {
      this.notice.set({ text: await work(), error: false, form });
    } catch (e) {
      this.notice.set({ text: this.failureText(e), error: true, form });
    } finally {
      this.saving.set(null);
    }
  }

  // #endregion
}
