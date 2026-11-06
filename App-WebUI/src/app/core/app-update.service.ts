import { filter } from 'rxjs';
import { SwUpdate } from '@angular/service-worker';
import { NavigationEnd, Router } from '@angular/router';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

const CHECK_MS = 30 * 60 * 1000;

/**
 * Keeps the site (and every installed app) on the newest deploy. The service worker keeps an offline copy, so without this a new deploy only showed after
 * closing the app completely, sometimes twice. It looks for a new version when the page opens, whenever the tab comes back into view and every 30 minutes;
 * once the new version is downloaded, the page reloads at a safe moment: the next change of screen, or the next time the tab comes back into view.
 * It never reloads in the middle of what is on screen (a half-typed form stays). Without a service worker (development, the server) it does nothing.
 */
@Injectable({ providedIn: 'root' })

export class AppUpdateService {
  private ready = false;
  private readonly sw = inject(SwUpdate);
  private readonly doc = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  // #region Public Methods

  /** Starts watching for new versions. Call once in the browser. */
  start(): void {
    if (!this.browser || !this.sw.isEnabled)
      return;
    this.sw.versionUpdates.pipe(filter((e) => e.type === 'VERSION_READY')).subscribe(() => (this.ready = true));
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => this.reloadIfReady());
    this.doc.addEventListener('visibilitychange', () => {
      if (this.doc.visibilityState !== 'visible')
        return;
      this.reloadIfReady();
      this.check();
    });
    setInterval(() => this.check(), CHECK_MS);
    this.check();
  }

  // #endregion

  // #region Private Methods

  private check(): void {
    this.sw.checkForUpdate().catch(() => undefined);
  }

  private reloadIfReady(): void {
    if (this.ready)
      this.doc.location.reload();
  }

  // #endregion
}
