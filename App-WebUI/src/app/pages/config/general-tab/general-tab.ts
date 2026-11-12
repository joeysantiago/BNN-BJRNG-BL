import { appLink } from '../../../core/apps';
import { NgComponentOutlet } from '@angular/common';
import { appFeatures } from '../../../core/features';
import { SignupCard } from '../signup-card/signup-card';
import { AuthService } from '../../../core/auth.service';
import { I18nService } from '../../../core/i18n.service';
import { ActivatedRoute, Router } from '@angular/router';
import { StorageCard } from '../storage-card/storage-card';
import { AppNameForm } from '../app-name-form/app-name-form';
import { AppSection, LoadedPanels } from './general-tab.model';
import { PageId } from '../../../core/models/app-settings.model';
import { SettingsService } from '../../../core/settings.service';
import { FeatureSwitches } from '../feature-switches/feature-switches';
import { FEATURE_APPS, FEATURE_SETTINGS } from '../../../feature-routes';
import { Component, afterNextRender, computed, inject, signal } from '@angular/core';

/**
 * The General tab of the Settings page, for every logged-in user: one section per app the user may open (and this branch holds), so every app is set up
 * in one place. A super admin sees every app and can rename it; anyone else sees only their own apps. Each section shows the app's name, its site switches
 * (with the Site options right) and the settings the app brings itself (FEATURE_SETTINGS of feature-routes.ts, loaded lazily). ?app=<code> opens one section.
 * A super admin also sets the sign-up and, with a password login (the API checks the same), where every app keeps its files.
 */
@Component({
  selector: 'app-general-tab',
  imports: [NgComponentOutlet, AppNameForm, FeatureSwitches, SignupCard, StorageCard],
  templateUrl: './general-tab.html',
  styleUrl: './general-tab.scss',
})

export class GeneralTab {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  private readonly cfg = inject(SettingsService);
  private readonly route = inject(ActivatedRoute);
  protected readonly loaded = signal<LoadedPanels>({});
  protected readonly opened = signal(this.route.snapshot.queryParamMap.get('app'));
  /** File storage: a super admin who logged in with a password, as the API's storage settings need. */
  protected readonly canStorage = computed(() => this.auth.isSuperAdmin() && this.auth.user()?.loginMethod !== 'otp');
  /** The apps of this branch the user may open (the speed test is open to everyone) that have something to set for them. */
  protected readonly sections = computed(() => FEATURE_APPS.filter((c) => c === 'speedtest' || this.auth.hasApp(c)).map((c) => this.section(c)).filter((s) => s.canRename || s.features.length || s.panels.length));

  constructor() {
    afterNextRender(() => void this.loadPanels());
  }

  // #region Public Methods

  /** Keeps the open section in the address (?app=), so a link from inside an app opens its section. */
  toggle(code: string, ev: Event): void {
    const open = (ev.target as HTMLDetailsElement).open;
    if (!open && this.opened() !== code)
      return;
    this.opened.set(open ? code : null);
    void this.router.navigate([], { relativeTo: this.route, queryParams: { app: open ? code : null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  // #endregion

  // #region Private Methods

  /** Loads the settings components of the apps the user may open; an app the user cannot open is never loaded. */
  private async loadPanels(): Promise<void> {
    const entries = await Promise.all(this.sections().map(async (s) => [s.code, await Promise.all(s.panels.map((p) => p.load()))] as const));
    this.loaded.set(Object.fromEntries(entries));
    document.getElementById(`gen-app-${this.opened()}`)?.scrollIntoView({ block: 'start' });
  }

  private section(code: string): AppSection {
    const page = code === 'speedtest' ? 'speed' : code;
    const named = page in this.cfg.defaults.pageNames;
    const name = named ? this.i18n.page(page as PageId) : this.i18n.t(appLink(code).name);
    const features = this.auth.can('settings.features') ? appFeatures(code) : [];
    const panels = FEATURE_SETTINGS.filter((p) => p.app === code).sort((a, b) => a.order - b.order);
    return { code, name, page, features, panels, canRename: named && this.auth.isSuperAdmin() };
  }

  // #endregion
}
