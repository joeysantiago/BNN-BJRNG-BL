import { RouterLink } from '@angular/router';
import { SITE_URL } from '../../../core/site';
import { SeoService } from '../../../core/seo.service';
import { I18nService } from '../../../core/i18n.service';
import { Component, computed, effect, inject } from '@angular/core';

/**
 * The public page of SnapTracker (/tracker): what the app does with a bank SMS, its privacy promises, how it works and a FAQ. Prerendered with its title,
 * description, canonical, share image and JSON-LD (WebApplication and FAQPage), in English, Hindi and Arabic.
 */
@Component({
  selector: 'app-tracker-landing',
  imports: [RouterLink],
  templateUrl: './tracker-landing.html',
  styleUrl: './tracker-landing.scss',
})

export class TrackerLanding {
  private readonly seo = inject(SeoService);
  protected readonly faqs = [1, 2, 3, 4, 5];
  protected readonly i18n = inject(I18nService);
  protected readonly promises = ['otp', 'words', 'dups'];
  protected readonly appName = computed(() => this.i18n.page('tracker'));
  protected readonly features = ['auto', 'words', 'dups', 'review', 'charts', 'privacy'];

  constructor() {
    effect(() => {
      const name = this.appName();
      const title = this.i18n.t('seo.tracker.title', { app: name });
      const description = this.i18n.t('seo.tracker.desc', { app: name });
      this.seo.set({
        title,
        description,
        path: '/tracker/',
        image: 'default',
        imageAlt: name,
        lang: this.i18n.lang(),
        jsonLd: [
          { '@context': 'https://schema.org', '@type': 'WebApplication', name, url: SITE_URL + '/tracker/', description, applicationCategory: 'FinanceApplication', operatingSystem: 'Any', offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' } },
          { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: this.faqs.map((i) => ({ '@type': 'Question', name: this.i18n.t(`tracker.l.q${i}`, { app: name }), acceptedAnswer: { '@type': 'Answer', text: this.i18n.t(`tracker.l.a${i}`, { app: name }) } })) },
        ],
      });
    });
  }
}
