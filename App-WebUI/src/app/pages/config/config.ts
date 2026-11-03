import { TranslationKey } from '../../i18n/en';
import { RolesTab } from './roles-tab/roles-tab';
import { UsersTab } from './users-tab/users-tab';
import { SeoService } from '../../core/seo.service';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n.service';
import { AccountTab } from './account-tab/account-tab';
import { PermissionsTab } from './permissions-tab/permissions-tab';
import { SettingsService } from '../../core/settings.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ConfigGroup, SaveNotice, SaveTarget, SettingsTab, TabInfo } from './config.model';
import { FEATURES, FEATURE_APPS, FEATURE_GROUPS, featureBuilt } from '../../core/features';
import { AppSettings, ConnectionField, FeatureGroup, FeatureId, SettingsOverrides, SettingsSection } from '../../core/models/app-settings.model';

/** Every tab of the page, in order. A tab shows when the user's role may view its page and this build holds what it is about. */
const TABS: TabInfo[] = [
  { id: 'account', page: 'settings.account' },
  { id: 'users', page: 'settings.users' },
  { id: 'roles', page: 'settings.roles' },
  { id: 'permissions', page: 'settings.permissions' },
  { id: 'features', page: 'settings.features' },
  { id: 'connection', page: 'settings.connection' },
  { id: 'services', page: 'settings.services' },
  { id: 'youtube', page: 'settings.youtube' },
  { id: 'json', page: 'settings.json' },
];

/**
 * /master, the Settings page, the same as in the API branches. One tab per area, shown by the rights of the user's role (Role rights tab; a super admin sees every tab):
 * My settings (language, skin, password and the options of their own pages, for every user), Users, Roles, Role rights, and the site settings of this build's apps
 * (FEATURE_APPS). Site setting edits are drafts that preview at once; a Save button in every section (and Save all) saves them. Mojito has no API: the demo backend
 * in the browser checks every right again and keeps the data in this browser.
 */
@Component({
  selector: 'app-config',
  imports: [RouterLink, AccountTab, UsersTab, RolesTab, PermissionsTab],
  templateUrl: './config.html',
  styleUrl: './config.scss',
})

export class Config {
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  // Declared before the fields that read it: field initializers run in this order.
  protected readonly cfg = inject(SettingsService);
  protected readonly settings = this.cfg.settings;
  protected readonly defaults = this.cfg.defaults;
  protected readonly saving = signal<SaveTarget | null>(null);
  protected readonly count = computed(() => this.cfg.pending());
  protected readonly saveNotice = signal<SaveNotice | null>(null);
  protected readonly importMessage = signal<'' | 'ok' | 'bad'>('');
  protected readonly hasSpeed = featureBuilt('speed', FEATURE_APPS);
  protected readonly hasYoutube = featureBuilt('youtube', FEATURE_APPS);
  protected readonly json = computed(() => JSON.stringify(this.cfg.overrides(), null, 2));
  protected readonly tabs = computed(() => TABS.filter((t) => this.auth.can(t.page) && this.built(t.id)));
  protected readonly fields = computed(() => Object.keys(this.defaults.connection.fields) as ConnectionField[]);
  protected readonly requested = signal<SettingsTab | null>(this.route.snapshot.queryParamMap.get('tab') as SettingsTab | null);
  /** The open tab: the one asked for in ?tab= when the user may see it, otherwise the first. */
  protected readonly current = computed(() => this.tabs().find((t) => t.id === this.requested()) ?? this.tabs()[0] ?? null);
  /** The site settings sections the user may save; Save all saves only these. */
  protected readonly editable = computed(() => this.sections().filter((s) => this.auth.can(s === 'connection' ? 'settings.connection' : s === 'services' ? 'settings.services' : 'settings.features', 'edit')));
  protected readonly groups: ConfigGroup[] = FEATURE_GROUPS.filter((g) => featureBuilt(g.id, FEATURE_APPS)).map((g) => ({ ...g, items: FEATURES.filter((f) => f.group === g.id && featureBuilt(f.id, FEATURE_APPS)) })).filter((g) => g.items.length);

  constructor() {
    effect(() => {
      this.seo.set({
        title: this.i18n.t('seo.cfg.title'),
        description: this.i18n.t('seo.cfg.desc'),
        path: '/master/',
        image: 'default',
        lang: this.i18n.lang(),
        // A tool for the site's users and owner, not a page to find in search results.
        noindex: true,
      });
    });
  }

  // #region Public Methods

  reset(): void {
    this.cfg.reset();
  }

  secs(ev: Event): void {
    this.cfg.setRefreshSeconds(+(ev.target as HTMLInputElement).value);
  }

  state(on: boolean): string {
    return this.i18n.t(on ? 'cfg.on' : 'cfg.off');
  }

  checked(ev: Event): boolean {
    return (ev.target as HTMLInputElement).checked;
  }

  tabName(tab: TabInfo): string {
    return this.i18n.t(`perm.page.${tab.page}` as TranslationKey);
  }

  /** Opens a tab and keeps it in the address (?tab=), so a reload or a shared link opens the same tab. */
  select(id: SettingsTab): void {
    this.requested.set(id);
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab: id }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  importJson(text: string): void {
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

  saveLabel(target: SaveTarget): string {
    return this.i18n.t(this.saving() === target ? 'cfg.save.saving' : target === 'all' ? 'cfg.save.all' : 'cfg.save');
  }

  feature(id: FeatureId, ev: Event): void {
    this.cfg.setFeature(id, this.checked(ev));
  }

  label(id: ConnectionField): TranslationKey {
    return `conn.${id}` as TranslationKey;
  }

  /** Unsaved edits in one section; 0 disables that section's Save button. */
  pendingIn(section: SettingsSection): number {
    return this.cfg.pending([section]);
  }

  /** Saves one section, or every unsaved edit the user may save for `all`. The backend checks the rights again; the page only shows what it answers. */
  async save(target: SaveTarget): Promise<void> {
    this.saving.set(target);
    this.saveNotice.set(null);
    try {
      const text = await this.cfg.save(target === 'all' ? this.editable() : [target]);
      this.saveNotice.set({ text: text || this.i18n.t('cfg.save.nothing'), error: false, section: target });
    } catch (e) {
      this.saveNotice.set({ text: this.failureText(e), error: true, section: target });
    } finally {
      this.saving.set(null);
    }
  }

  /** The answer of the last save, only when it belongs to this Save button. */
  noticeFor(target: SaveTarget): SaveNotice | null {
    const n = this.saveNotice();
    return n?.section === target ? n : null;
  }

  /** The YouTube key and the download helper are a draft until their Save button is pressed, like the other site settings. */
  youtube(key: keyof AppSettings['youtube'], ev: Event): void {
    this.cfg.setYoutube(key, (ev.target as HTMLInputElement).value.trim());
  }

  /** Arrow keys, Home and End move between the tabs (the WAI-ARIA tabs pattern); the tab that gets focus opens. */
  onTabKey(ev: KeyboardEvent, index: number): void {
    const tabs = this.tabs();
    const step = this.i18n.dir() === 'rtl' ? -1 : 1;
    const moves: Record<string, number> = { ArrowRight: index + step, ArrowLeft: index - step, Home: 0, End: tabs.length - 1 };
    if (!(ev.key in moves))
      return;
    ev.preventDefault();
    const next = tabs[(moves[ev.key] + tabs.length) % tabs.length];
    this.select(next.id);
    document.getElementById(`cfg-tab-${next.id}`)?.focus();
  }

  // #endregion

  // #region Private Methods

  /** Every site settings section this build shows: the feature groups, then connection and services when the speed test is built. */
  private sections(): SettingsSection[] {
    const groups: SettingsSection[] = this.groups.map((g) => g.id as FeatureGroup);
    return this.hasSpeed ? [...groups, 'connection', 'services'] : groups;
  }

  /** Whether this build holds what the tab is about. */
  private built(id: SettingsTab): boolean {
    return id === 'connection' || id === 'services' ? this.hasSpeed : id === 'youtube' ? this.hasYoutube : id === 'features' ? this.groups.length > 0 : true;
  }

  /** The backend's own message when it answered; "server unreachable" when it did not. */
  private failureText(e: unknown): string {
    return (e as { status?: number }).status !== undefined ? (e as Error).message : this.i18n.t('auth.serverDown');
  }

  // #endregion
}
