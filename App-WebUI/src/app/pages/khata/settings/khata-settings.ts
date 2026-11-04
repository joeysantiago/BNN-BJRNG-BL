import { Lang } from '../../../core/site';
import { KhataMail } from './khata-mail/khata-mail';
import { toSignal } from '@angular/core/rxjs-interop';
import { KhataUsers } from './khata-users/khata-users';
import { KhataIcon } from '../ui/khata-icon/khata-icon';
import { AuthService } from '../../../core/auth.service';
import { I18nService } from '../../../core/i18n.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ThemeService } from '../../../core/theme.service';
import { ThemeMode } from '../../../core/models/theme.model';
import { KhataApiService } from '../../../core/khata-api.service';
import { KhataLockService } from '../../../core/khata-lock.service';
import { KhataStateService } from '../../../core/khata-state.service';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { KhataIconName, KhataNotice, KhataSettingsTab, KhataStorage, KhataStorageProvider } from '../../../core/models/khata.model';

/**
 * /khata/app/settings (?tab=): SnapKhata's settings in tabs, like the site's Settings page. General: theme, language and (in the installed app) changing the app lock PIN. Notifications: whether
 * SnapKhata sends notifications at all (each party's channels are on that party's settings). File storage: where bill photos are kept for the
 * whole site, local or Azure Blob. Mail: the mail servers for one-time codes and notifications. Users: every account, to edit, archive / activate,
 * delete or restore. Only a super admin who logged in with a password sees
 * the last three, and the API checks the same.
 */
@Component({
  selector: 'app-khata-settings',
  imports: [KhataIcon, KhataMail, KhataUsers],
  templateUrl: './khata-settings.html',
  styleUrl: './khata-settings.scss',
})

export class KhataSettings {
  protected readonly busy = signal(false);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(KhataApiService);
  private readonly route = inject(ActivatedRoute);
  protected readonly theme = inject(ThemeService);
  private readonly state = inject(KhataStateService);
  protected readonly lock = inject(KhataLockService);
  protected readonly notice = signal<KhataNotice | null>(null);
  protected readonly storage = signal<KhataStorage | null>(null);
  protected readonly notifications = signal<boolean | null>(null);
  protected readonly modes: ThemeMode[] = ['light', 'dark', 'system'];
  protected readonly provider = signal<KhataStorageProvider>('local');
  private readonly query = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  protected readonly modeIcons: Record<ThemeMode, KhataIconName> = { light: 'sun', dark: 'moon', system: 'monitor' };
  /** Only a super admin whose session logged in with a password may change where the site keeps files, or manage the users. */
  protected readonly canStorage = computed(() => this.auth.isSuperAdmin() && this.auth.user()?.loginMethod !== 'otp');
  protected readonly tabs = computed<KhataSettingsTab[]>(() => (this.canStorage() ? ['general', 'notifications', 'storage', 'mail', 'users'] : ['general', 'notifications']));
  protected readonly tab = computed<KhataSettingsTab>(() => {
    const wanted = this.query().get('tab') as KhataSettingsTab | null;
    return wanted && this.tabs().includes(wanted) ? wanted : 'general';
  });

  constructor() {
    effect(() => this.state.screen(this.i18n.t('khata.nav.settings')));
    effect(() => {
      const tab = this.tab();
      untracked(() => void this.load(tab));
    });
  }

  // #region Public Methods

  setLang(lang: Lang): void {
    this.i18n.set(lang);
  }

  /** Left / Right move between the tabs (swapped in Arabic), as in a tab list. */
  tabKey(ev: KeyboardEvent): void {
    if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft')
      return;
    ev.preventDefault();
    const tabs = this.tabs();
    const step = (ev.key === 'ArrowRight') !== (this.i18n.dir() === 'rtl') ? 1 : -1;
    const next = tabs[(tabs.indexOf(this.tab()) + step + tabs.length) % tabs.length];
    this.open(next);
    setTimeout(() => document.getElementById('ks-tab-' + next)?.focus());
  }

  open(tab: KhataSettingsTab): void {
    this.notice.set(null);
    void this.router.navigate([], { queryParams: { tab }, replaceUrl: true });
  }

  async testStorage(): Promise<void> {
    await this.run(() => this.api.testStorage());
  }

  async saveStorage(form: HTMLFormElement): Promise<void> {
    const data = new FormData(form);
    const text = (key: string): string => String(data.get(key) ?? '').trim();
    const request = { provider: this.provider(), enabled: data.get('enabled') === 'on', accountName: text('accountName'), containerName: text('containerName'), connectionString: text('connectionString') || undefined };
    await this.run(async () => {
      const message = await this.api.saveStorage(request);
      this.storage.set(await this.api.storage());
      (form.elements.namedItem('connectionString') as HTMLInputElement | null)?.setAttribute('value', '');
      return message;
    });
  }

  async toggleNotifications(box: HTMLInputElement): Promise<void> {
    const on = box.checked;
    await this.run(async () => {
      const text = await this.api.saveSettings(on);
      this.notifications.set(on);
      return text;
    });
    box.checked = this.notifications() ?? false;
  }

  // #endregion

  // #region Private Methods

  private async load(tab: KhataSettingsTab): Promise<void> {
    try {
      if (tab === 'notifications' && this.notifications() === null)
        this.notifications.set((await this.api.settings()).notificationsEnabled);
      if (tab === 'storage' && !this.storage()) {
        const storage = await this.api.storage();
        this.storage.set(storage);
        this.provider.set(storage.provider);
      }
    } catch (e) {
      this.notice.set({ text: (e as Error).message, error: true });
    }
  }

  private async run(work: () => Promise<string>): Promise<void> {
    if (this.busy())
      return;
    this.busy.set(true);
    this.notice.set(null);
    try {
      this.notice.set({ text: await work(), error: false });
    } catch (e) {
      this.notice.set({ text: (e as Error).message, error: true });
    } finally {
      this.busy.set(false);
    }
  }

  // #endregion
}
