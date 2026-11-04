import { ApiService } from './api.service';
import { I18nService } from './i18n.service';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { AppWindow, InstallableApp } from './models/app-pwa.model';

/**
 * Makes every app (Speed test, Creta, Nexon, YouTube, SnapKhata) installable as its own app on a phone or computer. Routes live in the hash, so
 * every screen shares the path "/"; an installed app therefore runs at its own path /apps/<code>/ (the scope and start address of its manifest, a
 * copy of the app shell written by scripts/postbuild.mjs). Different scopes and manifest ids keep each install apart, and one never replaces another.
 * - In an app's own window (/apps/<code>/) the page keeps that app's manifest whatever screen is open.
 * - On the plain site, an app's screen points the page at that app's manifest while it is open (installing from there installs that app), and
 *   leaving puts the site's back. iOS gets the app's home-screen title and icon (icons/<app>-apple-touch-icon.png).
 * The manifest is built by the API (AppManifests), so the app's name comes from the PageNames table in the reader's language.
 */
@Injectable({ providedIn: 'root' })

export class AppPwaService {
  private users = 0;
  private saved: string[] | null = null;
  private readonly doc = inject(DOCUMENT);
  private readonly api = inject(ApiService);
  private readonly i18n = inject(I18nService);
  /** The app whose own window this is (the path /apps/<code>/), or null on the plain site and on the server. */
  private readonly own = (isPlatformBrowser(inject(PLATFORM_ID)) ? /^\/apps\/(khata|creta|nexon|youtube|speedtest)\/?$/.exec(location.pathname)?.[1] ?? null : null) as AppWindow | null;

  constructor() {
    if (this.own && this.own !== 'speedtest')
      this.point(this.own);
  }

  // #region Public Methods

  leave(): void {
    this.users = Math.max(0, this.users - 1);
    if (this.own || this.users || !this.saved)
      return;
    const [manifest, title, icon] = this.links();
    manifest?.setAttribute('href', this.saved[0]);
    title?.setAttribute('content', this.saved[1]);
    icon?.setAttribute('href', this.saved[2]);
    this.saved = null;
  }

  enter(app: InstallableApp): void {
    this.users++;
    if (this.own)
      return;
    const [manifest, title, icon] = this.links();
    if (!this.saved)
      this.saved = [manifest?.getAttribute('href') ?? '', title?.getAttribute('content') ?? '', icon?.getAttribute('href') ?? ''];
    this.point(app);
  }

  // #endregion

  // #region Private Methods

  /** The manifest link, iOS title and iOS icon. In an app's own window index.html drops the site's manifest link before any fetch, so it is made here. */
  private links(): (Element | null)[] {
    const head = this.doc.head;
    let manifest = head.querySelector('link[rel=manifest]');
    if (!manifest) {
      manifest = this.doc.createElement('link');
      manifest.setAttribute('rel', 'manifest');
      head.appendChild(manifest);
    }
    return [manifest, head.querySelector('meta[name=apple-mobile-web-app-title]'), head.querySelector('link[rel=apple-touch-icon]')];
  }

  private point(app: InstallableApp): void {
    const [manifest, title, icon] = this.links();
    manifest?.setAttribute('href', this.api.url(`/apps/${app}/manifest.webmanifest?lang=${this.i18n.lang()}`));
    title?.setAttribute('content', this.i18n.page(app));
    icon?.setAttribute('href', `icons/${app}-apple-touch-icon.png`);
  }

  // #endregion
}
