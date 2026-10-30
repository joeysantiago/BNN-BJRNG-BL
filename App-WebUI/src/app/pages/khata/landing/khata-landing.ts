import { RouterLink } from '@angular/router';
import { SITE_URL } from '../../../core/site';
import { SeoService } from '../../../core/seo.service';
import { I18nService } from '../../../core/i18n.service';
import { Component, effect, inject } from '@angular/core';

const PATH = '/khata/';
const FAQ = ['q1', 'q2', 'q3', 'q4'];
const FEATURES = ['f1', 'f2', 'f3', 'f4', 'f5'];

/** /khata: the public, prerendered SnapKhata page for visitors and search engines. The app itself is behind login at /khata/app. */
@Component({
  selector: 'app-khata-landing',
  imports: [RouterLink],
  templateUrl: './khata-landing.html',
  styleUrl: './khata-landing.scss',
})

export class KhataLanding {
  protected readonly faq = FAQ;
  protected readonly features = FEATURES;
  private readonly seo = inject(SeoService);
  protected readonly i18n = inject(I18nService);

  constructor() {
    effect(() => {
      const title = this.i18n.t('seo.khata.title');
      const description = this.i18n.t('seo.khata.desc');
      this.seo.set({
        title,
        description,
        path: PATH,
        image: 'default',
        lang: this.i18n.lang(),
        imageAlt: this.i18n.t('khata.l.h1'),
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: this.i18n.t('khata.app.name'),
            url: SITE_URL + PATH,
            applicationCategory: 'FinanceApplication',
            operatingSystem: 'Any',
            description,
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ.map((q) => ({ '@type': 'Question', name: this.i18n.t(`khata.l.${q}`), acceptedAnswer: { '@type': 'Answer', text: this.i18n.t(`khata.l.${q}a`) } })),
          },
        ],
      });
    });
  }
}
