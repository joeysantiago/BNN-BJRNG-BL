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
    .foot {
      margin-block-start: 48px;
      padding-block: 28px;
      border-block-start: var(--header-border);
      background: var(--header-bg);
      -webkit-backdrop-filter: var(--header-filter);
      backdrop-filter: var(--header-filter);
    }
    .foot-in {
      display: flex;
      flex-wrap: wrap;
      gap: 12px 24px;
      align-items: center;
      justify-content: space-between;
    }
    .links {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 8px;
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
      font-size: 14px;
    }
  `,
})

export class SiteFooter {
  protected readonly site = SITE_NAME;
  protected readonly i18n = inject(I18nService);
  protected readonly cfg = inject(SettingsService);
  protected readonly year = new Date().getFullYear();
}
