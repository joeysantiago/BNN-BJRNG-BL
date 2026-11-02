import { SITE_NAME } from '../core/site';
import { RouterLink } from '@angular/router';
import { Component, inject } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { SettingsService } from '../core/settings.service';

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
  protected readonly i18n = inject(I18nService);
  protected readonly cfg = inject(SettingsService);
  protected readonly site = SITE_NAME;
  protected readonly year = new Date().getFullYear();
}
