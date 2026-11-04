import { ApiService } from './api.service';
import { DOCUMENT } from '@angular/common';
import { I18nService } from './i18n.service';
import { Injectable, inject } from '@angular/core';
import { InstallableApp } from './models/app-pwa.model';

/**
 * Makes each app (SnapKhata, Creta, Nexon) installable as its own app on a phone. All routes share the path "/" (they live in the hash), so while
 * an app's screen is open the page points at that app's manifest (its own id, name, icons and start address) instead of the speed test's, and
 * iOS gets the app's home-screen title and icon (icons/<app>-apple-touch-icon.png).
 * The manifest is built by the API (AppManifests), so the app's name comes from the PageNames table in the reader's language. Leaving the app puts the site's back.
 */
@Injectable({ providedIn: 'root' })

export class AppPwaService {
  private users = 0;
  private saved: string[] | null = null;
  private readonly doc = inject(DOCUMENT);
  private readonly api = inject(ApiService);
  private readonly i18n = inject(I18nService);

  // #region Public Methods

  leave(): void {
    this.users = Math.max(0, this.users - 1);
    if (this.users || !this.saved)
      return;
    const [manifest, title, icon] = this.links();
    manifest?.setAttribute('href', this.saved[0]);
    title?.setAttribute('content', this.saved[1]);
    icon?.setAttribute('href', this.saved[2]);
    this.saved = null;
  }

  enter(app: InstallableApp): void {
    this.users++;
    const [manifest, title, icon] = this.links();
    if (!this.saved)
      this.saved = [manifest?.getAttribute('href') ?? '', title?.getAttribute('content') ?? '', icon?.getAttribute('href') ?? ''];
    manifest?.setAttribute('href', this.api.url(`/apps/${app}/manifest.webmanifest?lang=${this.i18n.lang()}`));
    title?.setAttribute('content', this.i18n.page(app));
    icon?.setAttribute('href', `icons/${app}-apple-touch-icon.png`);
  }

  // #endregion

  // #region Private Methods

  private links(): (Element | null)[] {
    const head = this.doc.head;
    return [head.querySelector('link[rel=manifest]'), head.querySelector('meta[name=apple-mobile-web-app-title]'), head.querySelector('link[rel=apple-touch-icon]')];
  }

  // #endregion
}
