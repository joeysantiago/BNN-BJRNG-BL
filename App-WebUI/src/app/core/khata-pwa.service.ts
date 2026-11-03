import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

const MANIFEST = 'khata.webmanifest';
const APPLE_ICON = 'icons/khata-apple-touch-icon.png';

/**
 * Makes SnapKhata installable as its own app on a phone. All routes share the path "/" (they live in the hash), so while a SnapKhata
 * screen is open the page points at SnapKhata's manifest (its own id, name, icons and start address /#/khata/app) instead of the
 * speed test's, and iOS gets SnapKhata's home-screen title and icon. Leaving SnapKhata puts the site's back.
 */
@Injectable({ providedIn: 'root' })

export class KhataPwaService {
  private users = 0;
  private saved: string[] | null = null;
  private readonly doc = inject(DOCUMENT);

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

  enter(appName: string): void {
    this.users++;
    const [manifest, title, icon] = this.links();
    if (!this.saved)
      this.saved = [manifest?.getAttribute('href') ?? '', title?.getAttribute('content') ?? '', icon?.getAttribute('href') ?? ''];
    manifest?.setAttribute('href', MANIFEST);
    title?.setAttribute('content', appName);
    icon?.setAttribute('href', APPLE_ICON);
  }

  // #endregion

  // #region Private Methods

  private links(): (Element | null)[] {
    const head = this.doc.head;
    return [head.querySelector('link[rel=manifest]'), head.querySelector('meta[name=apple-mobile-web-app-title]'), head.querySelector('link[rel=apple-touch-icon]')];
  }

  // #endregion
}
