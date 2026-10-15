import { isPlatformBrowser } from '@angular/common';
import { BeforeInstallPromptEvent } from './models/install.model';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

/** Drives the Install app button: native prompt on Chrome, Edge and Android, a hint on iPhone and iPad. */
@Injectable({ providedIn: 'root' })
export class InstallService {
  private deferred: BeforeInstallPromptEvent | null = null;

  /** True when the browser offered a native install prompt. */
  readonly canPrompt = signal(false);
  /** True on iPhone and iPad Safari, where install is manual. */
  readonly showIosHint = signal(false);
  readonly installed = signal(false);

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    this.installed.set(standalone);

    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
    if (ios && !standalone) this.showIosHint.set(true);

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferred = e as BeforeInstallPromptEvent;
      this.canPrompt.set(true);
    });
    window.addEventListener('appinstalled', () => {
      this.deferred = null;
      this.canPrompt.set(false);
      this.installed.set(true);
    });
  }

  async prompt(): Promise<void> {
    if (!this.deferred) return;
    await this.deferred.prompt();
    await this.deferred.userChoice;
    this.deferred = null;
    this.canPrompt.set(false);
  }
}
