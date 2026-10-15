import { filter, map } from 'rxjs';
import { I18nService } from './core/i18n.service';
import { SiteFooter } from './shared/site-footer';
import { SiteHeader } from './shared/site-header';
import { ThemeService } from './core/theme.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Component, afterNextRender, computed, inject } from '@angular/core';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeader, SiteFooter],
  template: `
    @if (!bare()) {
      <a class="skip" href="#main" (click)="skip($event)">{{ i18n.t('a11y.skip') }}</a>
      <app-site-header />
    }
    <main id="main" tabindex="-1" [class.bare]="bare()">
      <router-outlet />
    </main>
    @if (!bare()) {
      <app-site-footer />
    }
  `,
  styles: `
    main {
      display: block;
      outline: none;
    }
  `,
})
export class App {
  protected readonly i18n = inject(I18nService);
  private readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** The Atrium HR app is full screen and brings its own navigation, so the site header and footer are hidden there. */
  protected readonly bare = computed(() => /^\/HR(\/|$|[?#])/.test(this.url()));

  constructor() {
    afterNextRender(() => {
      // Applied after hydration so the prerendered HTML and the first client render match.
      this.theme.restore();
      const stored = this.i18n.stored();
      if (!stored) return;
      // Read the real address, not router.url: when the page starts from the cached app shell the router has not finished its first navigation yet.
      const path = location.pathname.replace(/\/+$/, '') || '/';
      if (path === '/') {
        // First visit to the home page after choosing Hindi or Arabic: open that language.
        if (stored !== 'en') void this.router.navigateByUrl(this.i18n.languages.find((l) => l.code === stored)!.home, { replaceUrl: true });
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
