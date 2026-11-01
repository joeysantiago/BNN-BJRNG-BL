import { appLink } from '../../core/apps';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { SeoService } from '../../core/seo.service';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n.service';
import { TranslationKey } from '../../core/models/i18n.model';
import { FEATURES, FEATURE_GROUPS } from '../../core/features';
import { KeyStatus } from '../../core/models/key-status.model';
import { AuthUser, UserAccess } from '../../core/models/auth.model';
import { SettingsService, validStops } from '../../core/settings.service';
import { Component, afterNextRender, computed, effect, inject, signal } from '@angular/core';
import { ConfigGroup, PanelNotice, SaveNotice, SaveTarget, UserNotice } from './config.model';
import { ConnectionField, FeatureId, SettingsOverrides, SettingsSection } from '../../core/models/app-settings.model';

/**
 * Shows every setting from the settings master tables (served by the API) and lets an administrator change it. Edits are drafts that preview at once
 * in this browser; a Save button in every section (and Save all at the top) writes them to the database. The Users and access panel decides which
 * apps each account may open. Other logged-in users only see a short note: the API refuses their changes anyway.
 */
@Component({
  selector: 'app-config',
  imports: [RouterLink],
  templateUrl: './config.html',
  styleUrl: './config.scss',
})

export class Config {
  protected readonly busy = signal(false);
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);
  protected readonly gaugeBad = signal(false);
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  // Declared before the fields that read it: field initializers run in this order.
  protected readonly cfg = inject(SettingsService);
  protected readonly settings = this.cfg.settings;
  protected readonly defaults = this.cfg.defaults;
  protected readonly usersError = signal<string>('');
  protected readonly ytKeySet = signal<boolean | null>(null);
  protected readonly savingUser = signal<number | null>(null);
  protected readonly access = signal<UserAccess | null>(null);
  protected readonly saving = signal<SaveTarget | null>(null);
  protected readonly count = computed(() => this.cfg.pending());
  protected readonly ytNotice = signal<PanelNotice | null>(null);
  protected readonly saveNotice = signal<SaveNotice | null>(null);
  protected readonly userNotice = signal<UserNotice | null>(null);
  protected readonly importMessage = signal<'' | 'ok' | 'bad'>('');
  protected readonly json = computed(() => JSON.stringify(this.cfg.overrides(), null, 2));
  protected readonly fields = computed(() => Object.keys(this.defaults.connection.fields) as ConnectionField[]);
  protected readonly groups: ConfigGroup[] = FEATURE_GROUPS.map((g) => ({ ...g, items: FEATURES.filter((f) => f.group === g.id) }));
  protected readonly autoApps = computed(() => (this.access()?.apps ?? []).filter((a) => a.autoGrant).map((a) => this.appName(a.code)).join(', '));

  constructor() {
    effect(() => {
      this.seo.set({
        title: this.i18n.t('seo.cfg.title'),
        description: this.i18n.t('seo.cfg.desc'),
        path: '/master/',
        image: 'default',
        lang: this.i18n.lang(),
        // A tool for the site owner, not a page to find in search results.
        noindex: true,
      });
    });

    // The guard has restored the login before this page opens, so isAdmin is known here.
    afterNextRender(() => {
      if (this.auth.isAdmin())
        void this.loadAdmin();
    });
  }

  // #region Private Methods

  protected reset(): void {
    this.cfg.reset();
  }

  protected secs(ev: Event): void {
    this.cfg.setRefreshSeconds(+(ev.target as HTMLInputElement).value);
  }

  /** Applies the typed gauge speeds (Mbps, separated by commas or spaces); a list the API would refuse is not applied. */
  protected gauge(ev: Event): void {
    const stops = (ev.target as HTMLInputElement).value.split(/[\s,]+/).filter(Boolean).map(Number);
    this.gaugeBad.set(!validStops(stops));
    if (!this.gaugeBad())
      this.cfg.setGaugeStops(stops);
  }

  protected state(on: boolean): string {
    return this.i18n.t(on ? 'cfg.on' : 'cfg.off');
  }

  protected checked(ev: Event): boolean {
    return (ev.target as HTMLInputElement).checked;
  }

  protected appName(code: string): string {
    return this.i18n.t(appLink(code).name);
  }

  /** The server's own message when it answered; "server unreachable" when it did not. */
  private failureText(e: unknown): string {
    return (e as { status?: number }).status !== undefined ? (e as Error).message : this.i18n.t('yt.serverdown');
  }

  private async loadAdmin(): Promise<void> {
    await Promise.all([this.loadKeyState(), this.loadUsers()]);
  }

  private async loadUsers(): Promise<void> {
    try {
      this.access.set(await this.api.get<UserAccess>('/admin/users'));
    } catch (e) {
      this.usersError.set(this.failureText(e));
    }
  }

  protected importJson(text: string): void {
    try {
      const parsed = JSON.parse(text) as SettingsOverrides;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        throw new Error('not an object');
      this.cfg.import(parsed);
      this.importMessage.set('ok');
    } catch {
      this.importMessage.set('bad');
    }
  }

  private async loadKeyState(): Promise<void> {
    try {
      this.ytKeySet.set((await this.api.get<KeyStatus>('/youtube/key')).isSet);
    } catch (e) {
      this.ytNotice.set({ text: this.failureText(e), error: true });
    }
  }

  protected saveLabel(target: SaveTarget): string {
    return this.i18n.t(this.saving() === target ? 'cfg.save.saving' : target === 'all' ? 'cfg.save.all' : 'cfg.save');
  }

  protected feature(id: FeatureId, ev: Event): void {
    this.cfg.setFeature(id, this.checked(ev));
  }

  protected label(id: ConnectionField): TranslationKey {
    return `conn.${id}` as TranslationKey;
  }

  /** Unsaved edits in one section; 0 disables that section's Save button. */
  protected pendingIn(section: SettingsSection): number {
    return this.cfg.pending([section]);
  }

  /** Saves one section, or every unsaved edit for `all`. The server checks that the caller is an administrator; the page only shows what it answers. */
  protected async save(target: SaveTarget): Promise<void> {
    this.saving.set(target);
    this.saveNotice.set(null);
    try {
      const text = await this.cfg.save(target === 'all' ? undefined : [target]);
      this.saveNotice.set({ text: text || this.i18n.t('cfg.save.nothing'), error: false, section: target });
    } catch (e) {
      this.saveNotice.set({ text: this.failureText(e), error: true, section: target });
    } finally {
      this.saving.set(null);
    }
  }

  /** The answer of the last save of this user row. */
  protected userNoticeFor(user: AuthUser): UserNotice | null {
    const n = this.userNotice();
    return n?.id === user.id ? n : null;
  }

  /** The answer of the last save, only when it belongs to this Save button. */
  protected noticeFor(target: SaveTarget): SaveNotice | null {
    const n = this.saveNotice();
    return n?.section === target ? n : null;
  }

  /** Saves one user's administrator switch and app boxes. The form is read before its fields are disabled (disabled fields are not sent). */
  protected async saveUser(ev: Event, user: AuthUser): Promise<void> {
    ev.preventDefault();
    if (this.savingUser() !== null)
      return;
    const data = new FormData(ev.target as HTMLFormElement);
    const body = { isAdmin: data.get('admin') !== null, apps: data.getAll('app').map(String) };
    this.savingUser.set(user.id);
    this.userNotice.set(null);
    try {
      const res = await this.api.sendFull<AuthUser>('PUT', `/admin/users/${user.id}`, this.api.json(body));
      this.access.update((a) => (a ? { ...a, users: a.users.map((u) => (u.id === user.id ? res.data : u)) } : a));
      this.auth.patchUser(res.data);
      this.userNotice.set({ id: user.id, text: res.message ?? '', error: false });
    } catch (e) {
      this.userNotice.set({ id: user.id, text: this.failureText(e), error: true });
    } finally {
      this.savingUser.set(null);
    }
  }

  /** Sends the YouTube API key. The API checks that the caller is an administrator and checks the key with Google, then stores it in the database. */
  protected async saveYoutube(ev: Event, input: HTMLInputElement): Promise<void> {
    ev.preventDefault();
    const key = input.value.trim();
    if (!key || this.busy())
      return;
    this.busy.set(true);
    this.ytNotice.set(null);
    try {
      const text = await this.api.message('POST', '/youtube/key', this.api.json({ apiKey: key }), 30000);
      this.ytKeySet.set(true);
      this.ytNotice.set({ text, error: false });
      input.value = '';
    } catch (e) {
      this.ytNotice.set({ text: this.failureText(e), error: true });
    } finally {
      this.busy.set(false);
    }
  }

  // #endregion
}
