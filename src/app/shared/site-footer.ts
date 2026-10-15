import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../core/i18n.service';
import { SITE_NAME } from '../core/site';

@Component({
  selector: 'app-site-footer',
  imports: [RouterLink],
  template: `
    <footer class="foot">
      <div class="wrap foot-in">
        <nav class="links" [attr.aria-label]="i18n.t('ft.about')">
          <a routerLink="/about/">{{ i18n.t('ft.about') }}</a>
          <a routerLink="/privacy/">{{ i18n.t('ft.privacy') }}</a>
          <a routerLink="/terms/">{{ i18n.t('ft.terms') }}</a>
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
  protected readonly i18n = inject(I18nService);
  protected readonly site = SITE_NAME;
  protected readonly year = new Date().getFullYear();
}
