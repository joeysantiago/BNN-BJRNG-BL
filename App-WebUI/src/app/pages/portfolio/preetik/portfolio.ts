import { SITE_URL } from '../../../core/site';
import { SeoService } from '../../../core/seo.service';
import { I18nService } from '../../../core/i18n.service';
import { Component, effect, inject } from '@angular/core';

/**
 * Preeti Kumari's portfolio. A simple full-screen page with its own header and footer, so the site header and footer are
 * hidden here (see App.bare). The content is a placeholder until the details are added.
 */
@Component({
  selector: 'app-portfolio-preetik',
  templateUrl: './portfolio.html',
  styleUrl: './portfolio.scss',
})

export class Portfolio {
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);

  constructor() {
    this.i18n.set('en', false); // the portfolio is in English
    effect(() => {
      this.seo.set({
        title: this.i18n.t('seo.preetik.title'),
        description: this.i18n.t('seo.preetik.desc'),
        path: '/preetik/',
        image: 'default',
        lang: 'en',
        imageAlt: 'Preeti Kumari, portfolio',
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'ProfilePage',
            url: `${SITE_URL}/preetik/`,
            name: this.i18n.t('seo.preetik.title'),
            mainEntity: { '@type': 'Person', name: 'Preeti Kumari', url: `${SITE_URL}/preetik/` },
          },
        ],
      });
    });
  }
}
