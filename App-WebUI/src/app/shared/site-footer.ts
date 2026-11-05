import { SITE_NAME } from '../core/site';
import { RouterLink } from '@angular/router';
import { I18nService } from '../core/i18n.service';
import { SettingsService } from '../core/settings.service';
import { Component, DestroyRef, ElementRef, afterNextRender, inject } from '@angular/core';

@Component({
  selector: 'app-site-footer',
  imports: [RouterLink],
  template: `
    <footer class="foot">
      <div class="wrap foot-in">
        <nav class="links" [attr.aria-label]="i18n.t('nav.pages')">
          @if (cfg.on('site.footer')) {
            @if (cfg.on('page.about')) {
              <a routerLink="/about/">{{ i18n.page('about') }}</a>
            }
            @if (cfg.on('page.privacy')) {
              <a routerLink="/privacy/">{{ i18n.page('privacy') }}</a>
            }
            @if (cfg.on('page.terms')) {
              <a routerLink="/terms/">{{ i18n.page('terms') }}</a>
            }
          }
        </nav>
        <p>&copy; {{ year }} {{ site }}.<span class="rights"> {{ i18n.t('ft.rights') }}</span></p>
      </div>
    </footer>
  `,
  styles: `
    /* Pinned to the bottom of every page and kept compact; links and copyright centred together. */
    .foot {
      position: fixed;
      inset-inline: 0;
      inset-block-end: 0;
      z-index: 50;
      margin: 0;
      padding-block: 4px calc(4px + env(safe-area-inset-bottom));
      border-block-start: var(--header-border);
      background: var(--header-bg);
      -webkit-backdrop-filter: var(--header-filter);
      backdrop-filter: var(--header-filter);
    }
    .foot-in {
      display: flex;
      flex-wrap: wrap;
      gap: 0 16px;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .links {
      display: flex;
      flex-wrap: wrap;
      gap: 0 2px;
    }
    .links a {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      padding-inline: 10px;
      color: var(--text);
      font-weight: 600;
    }
    p {
      margin: 0;
      color: var(--muted);
      font-size: 13px;
    }
    /* Narrow screens: links and copyright share one line; "All rights reserved" is dropped to make room. */
    @media (max-width: 720px) {
      .foot-in {
        flex-wrap: nowrap;
        gap: 0 6px;
      }
      .links {
        flex-wrap: nowrap;
        gap: 0;
      }
      .links a {
        padding-inline: 6px;
        font-size: 13px;
        white-space: nowrap;
      }
      p {
        font-size: 12px;
        white-space: nowrap;
      }
      .rights {
        display: none;
      }
    }
    /* Wide screens: a slimmer 40px bar. Phones keep the 44px tap targets above. */
    @media (min-width: 721px) {
      .links a {
        min-height: 32px;
        font-size: 14px;
      }
      p {
        font-size: 12px;
      }
    }
  `,
})
export class SiteFooter {
  protected readonly site = SITE_NAME;
  protected readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly cfg = inject(SettingsService);
  protected readonly year = new Date().getFullYear();
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Puts the footer's real height in --foot-space on <html>, kept up to date: a bigger system font or the phone's gesture bar makes it taller than --foot-h,
   * and every page leaves that room under its end (app shell), so nothing hides behind the footer. Hidden (an app with its own tab bar), it is 0.
   */
  constructor() {
    afterNextRender(() => {
      const root = document.documentElement;
      const foot = this.host.nativeElement.querySelector('footer')!;
      const observer = new ResizeObserver(() => root.style.setProperty('--foot-space', `${foot.offsetHeight}px`));
      observer.observe(foot);
      this.destroyRef.onDestroy(() => {
        observer.disconnect();
        root.style.removeProperty('--foot-space');
      });
    });
  }
}
