import { KeysTab } from './keys-tab/keys-tab';
import { RolesTab } from './roles-tab/roles-tab';
import { UsersTab } from './users-tab/users-tab';
import { SeoService } from '../../core/seo.service';
import { FEATURE_APPS } from '../../feature-routes';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n.service';
import { AccountTab } from './account-tab/account-tab';
import { GeneralTab } from './general-tab/general-tab';
import { SettingsIcon } from '../../shared/settings-icon';
import { TranslationKey } from '../../core/models/i18n.model';
import { PermissionsTab } from './permissions-tab/permissions-tab';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FeatureSwitches } from './feature-switches/feature-switches';
import { SettingsService, validStops } from '../../core/settings.service';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FEATURES, FEATURE_GROUPS, featureBuilt } from '../../core/features';
import { ConfigGroup, SaveNotice, SaveTarget, SettingsTab, TabInfo } from './config.model';
import { ConnectionField, FeatureGroup, SettingsSection } from '../../core/models/app-settings.model';

/** Every tab of the page, in order. A tab shows when the user's role may view its page and this branch holds what it is about. */
const TABS: TabInfo[] = [
  { id: 'general', page: null },
  { id: 'keys', page: null },
  { id: 'account', page: 'settings.account' },
  { id: 'users', page: 'settings.users' },
  { id: 'roles', page: 'settings.roles' },
  { id: 'permissions', page: 'settings.permissions' },
  { id: 'features', page: 'settings.features' },
  { id: 'connection', page: 'settings.connection' },
  { id: 'services', page: 'settings.services' },
];

/**
 * /master, the Settings page. One tab per area, shown by the rights of the user's role (Role rights tab; a super admin sees every tab).
 * General comes first, for every logged-in user: one section per app they may open, with its name (a super admin renames it), switches and the app's own settings.
 * Keys, for a super admin who logged in with a password: the settings with a login, key or password (mail, WhatsApp, the YouTube API key), kept encrypted in the database.
 * For me (language, skin, password and the options of their own pages, for every user), Users, Roles, Role rights, and the site settings of this branch's apps
 * (FEATURE_APPS). Site setting edits are drafts that preview at once in this browser; a Save button in every section (and Save all) writes them to the database.
 * The API checks every right again, so a hidden button is a convenience, not the protection.
 */
@Component({
  selector: 'app-config',
  imports: [RouterLink, GeneralTab, KeysTab, AccountTab, UsersTab, RolesTab, PermissionsTab, SettingsIcon, FeatureSwitches],
  templateUrl: './config.html',
  styleUrl: './config.scss',
})

export class Config {
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  protected readonly gaugeBad = signal(false);
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
  protected readonly hasSpeed = featureBuilt('speed', FEATURE_APPS);
  /** The Keys tab: a super admin who logged in with a password, as the API's mail settings need (SuperAdminPassword). */
  protected readonly canKeys = computed(() => this.auth.isSuperAdmin() && this.auth.user()?.loginMethod !== 'otp');
  /** General is for every logged-in user, Keys for a super admin with a password login, the rest by the View right of their page. */
  protected readonly tabs = computed(() => TABS.filter((t) => (t.page ? this.auth.can(t.page) : t.id === 'keys' ? this.canKeys() : !!this.auth.user()) && this.built(t.id)));
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

  /** Applies the typed gauge speeds (Mbps, separated by commas or spaces); a list the API would refuse is not applied. */
  gauge(ev: Event): void {
    const stops = (ev.target as HTMLInputElement).value.split(/[\s,]+/).filter(Boolean).map(Number);
    this.gaugeBad.set(!validStops(stops));
    if (!this.gaugeBad())
      this.cfg.setGaugeStops(stops);
  }

  checked(ev: Event): boolean {
    return (ev.target as HTMLInputElement).checked;
  }

  tabName(tab: TabInfo): string {
    return this.i18n.t((tab.page ? `perm.page.${tab.page}` : `cfg.tab.${tab.id}`) as TranslationKey);
  }

  /** Opens a tab and keeps it in the address (?tab=), so a reload or a shared link opens the same tab. */
  select(id: SettingsTab): void {
    this.requested.set(id);
    // On phones the tab row scrolls sideways: bring the chosen tab fully into view.
    document.getElementById(`cfg-tab-${id}`)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab: id }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  saveLabel(target: SaveTarget): string {
    return this.i18n.t(this.saving() === target ? 'cfg.save.saving' : target === 'all' ? 'cfg.save.all' : 'cfg.save');
  }

  label(id: ConnectionField): TranslationKey {
    return `conn.${id}` as TranslationKey;
  }

  /** Unsaved edits in one section; 0 disables that section's Save button. */
  pendingIn(section: SettingsSection): number {
    return this.cfg.pending([section]);
  }

  /** Saves one section, or every unsaved edit the user may save for `all`. The server checks the rights again; the page only shows what it answers. */
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

  /** Every site settings section this branch shows: the feature groups, then connection and services when the speed test is built. */
  private sections(): SettingsSection[] {
    const groups: SettingsSection[] = this.groups.map((g) => g.id as FeatureGroup);
    return this.hasSpeed ? [...groups, 'connection', 'services'] : groups;
  }

  /** Whether this branch holds what the tab is about (a Creta build has no speed test settings). */
  private built(id: SettingsTab): boolean {
    return id === 'connection' || id === 'services' ? this.hasSpeed : id === 'features' ? this.groups.length > 0 : true;
  }

  /** The server's own message when it answered; "server unreachable" when it did not. */
  private failureText(e: unknown): string {
    return (e as { status?: number }).status !== undefined ? (e as Error).message : this.i18n.t('yt.serverdown');
  }

  // #endregion
}
