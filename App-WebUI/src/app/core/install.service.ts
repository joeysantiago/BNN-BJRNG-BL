import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { BeforeInstallPromptEvent, InstallWindow } from './models/install.model';

/** Drives the Install app button: native prompt on Chrome, Edge and Android, a hint on iPhone and iPad. */
@Injectable({ providedIn: 'root' })

export class InstallService {
  /** True when the browser offered a native install prompt. */
  readonly canPrompt = signal(false);
  readonly installed = signal(false);

  /** True on iPhone and iPad Safari, where install is manual. */
  readonly showIosHint = signal(false);
  private deferred: BeforeInstallPromptEvent | null = null;

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID)))
      return;

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    this.installed.set(standalone);

    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
    if (ios && !standalone)
      this.showIosHint.set(true);

    // A prompt the browser offered before Angular started was kept by index.html; later ones arrive here.
    const early = (window as InstallWindow).__installPrompt;
    if (early)
      this.offer(early);
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.offer(e as BeforeInstallPromptEvent);
    });
    window.addEventListener('appinstalled', () => {
      this.deferred = null;
      this.canPrompt.set(false);
      this.installed.set(true);
    });
  }

  // #region Public Methods

  async prompt(): Promise<void> {
    if (!this.deferred)
      return;
    await this.deferred.prompt();
    await this.deferred.userChoice;
    this.deferred = null;
    (window as InstallWindow).__installPrompt = null;
    this.canPrompt.set(false);
  }

  // #endregion

  // #region Private Methods

  private offer(event: BeforeInstallPromptEvent): void {
    this.deferred = event;
    this.canPrompt.set(true);
  }

  // #endregion
}
