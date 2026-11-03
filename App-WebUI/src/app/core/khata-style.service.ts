import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

const LINK_ID = 'khata-css';
const HREF = 'khata.css';

/**
 * Links the SnapKhata stylesheet (khata.css, built by angular.json with "inject": false) when a SnapKhata screen opens, so the rest of
 * the site never downloads it. `ready` turns true once it has loaded; the screens stay hidden until then, so nothing shows unstyled.
 * When prerendering, the link goes into the page's HTML.
 */
@Injectable({ providedIn: 'root' })

export class KhataStyleService {
  readonly ready = signal(false);
  private readonly doc = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  // #region Public Methods

  load(): void {
    // Already linked: by the prerendered page (its critical styles are inlined in the HTML) or by an earlier visit in this tab.
    if (this.doc.getElementById(LINK_ID)) {
      this.ready.set(true);
      return;
    }
    const link = this.doc.head.appendChild(this.link());
    if (!this.browser) {
      this.ready.set(true);
      return;
    }
    const done = (): void => this.ready.set(true);
    link.addEventListener('load', done, { once: true });
    // A stylesheet that fails to load must not leave the screen hidden.
    link.addEventListener('error', done, { once: true });
  }

  // #endregion

  // #region Private Methods

  private link(): HTMLLinkElement {
    const link = this.doc.createElement('link');
    link.id = LINK_ID;
    link.rel = 'stylesheet';
    link.href = HREF;
    return link;
  }

  // #endregion
}
