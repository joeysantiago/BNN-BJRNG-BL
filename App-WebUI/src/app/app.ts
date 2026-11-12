import { filter, map } from 'rxjs';
import { pageFeature } from './core/features';
import { AuthService } from './core/auth.service';
import { I18nService } from './core/i18n.service';
import { SiteFooter } from './shared/site-footer';
import { SiteHeader } from './shared/site-header';
import { SiteToasts } from './shared/site-toasts';
import { ThemeService } from './core/theme.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { AppPwaService } from './core/app-pwa.service';
import { SettingsService } from './core/settings.service';
import { NativeBackService } from './core/native-back.service';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Component, afterNextRender, computed, effect, inject } from '@angular/core';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeader, SiteFooter, SiteToasts],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})

export class App {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);
  protected readonly i18n = inject(I18nService);
  private readonly cfg = inject(SettingsService);
  private readonly back = inject(NativeBackService);

  /** The Atrium HR app, SnapKhata (its public page /khata and the app /khata/app), the My Tasks app (/tasks/app) and the SnapTracker app (/tracker/app) bring their own navigation, so the site header and footer are hidden there. */
  protected readonly bare = computed(() => /^\/(HR|khata|tasks\/app|tracker\/app)(\/|$|[?#])/.test(this.url()));
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  constructor() {
    // Started with the page, so an installed app's own window (/apps/<code>/) points at its manifest before the browser reads it.
    inject(AppPwaService);
    // A page that is switched off in the settings master table or on the /config page shows "page not found".
    effect(() => {
      const feature = pageFeature(this.url());
      if (feature && !this.cfg.on(feature))
        void this.router.navigateByUrl('/disabled', { replaceUrl: true });
    });

    afterNextRender(() => {
      // Applied after hydration so the prerendered HTML and the first client render match.
      this.theme.restore();
      // In the Android app the back button closes what is open on top before it goes to the previous page.
      this.back.start();
      // Restore a login from the refresh cookie (or another open tab) once per page load. Guards wait for the same answer.
      void this.auth.ensureSession();
      const stored = this.i18n.stored();
      if (!stored)
        return;
      // Read the real address, not router.url: when the page starts from the cached app shell the router has not finished its first navigation yet.
      // Routes live in the hash (/#/khata/app), so the path is always "/" in the browser; the hash holds the page that was opened.
      const route = location.hash.startsWith('#/') ? location.hash.slice(1).split('?')[0] : location.pathname;
      const path = route.replace(/\/+$/, '') || '/';
      if (path === '/') {
        // First visit to the home page after choosing Hindi or Arabic: open that language.
        if (stored !== 'en')
          void this.router.navigateByUrl(this.i18n.languages.find((l) => l.code === stored)!.home, { replaceUrl: true });
      } else if (!/^\/(hi|ar|HR)$/.test(path)) {
        // Other pages follow the saved choice. The speed test pages take their language from the URL.
        this.i18n.set(stored, false);
      }
    });
  }

  // #region Private Methods

  protected skip(ev: Event): void {
    ev.preventDefault();
    document.getElementById('main')?.focus();
  }

  // #endregion
}
