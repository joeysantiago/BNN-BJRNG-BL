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
          <a routerLink="/master/">{{ i18n.t('cfg.link') }}</a>
        </nav>
        <p>&copy; {{ year }} {{ site }}. {{ i18n.t('ft.rights') }}</p>
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
    /* Narrow screens: links on one line, the copyright line under them. */
    @media (max-width: 720px) {
      .links {
        justify-content: center;
      }
      .links a {
        padding-inline: 7px;
      }
      p {
        font-size: 12px;
        padding-block-end: 2px;
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
