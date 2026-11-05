import { RouterLink } from '@angular/router';
import { SITE_URL } from '../../../core/site';
import { SeoService } from '../../../core/seo.service';
import { I18nService } from '../../../core/i18n.service';
import { Component, computed, effect, inject } from '@angular/core';

/** The public page of My Tasks (/tasks): what the app does, how it installs, and a FAQ. Prerendered with its title, description, canonical, share image and JSON-LD. */
@Component({
  selector: 'app-tasks-landing',
  imports: [RouterLink],
  templateUrl: './tasks-landing.html',
  styleUrl: './tasks-landing.scss',
})

export class TasksLanding {
  private readonly seo = inject(SeoService);
  protected readonly faqs = [1, 2, 3, 4, 5];
  protected readonly i18n = inject(I18nService);
  protected readonly appName = computed(() => this.i18n.page('tasks'));
  protected readonly features = ['tabs', 'dates', 'checklist', 'marketing', 'photos', 'lock', 'repeat', 'install'];

  constructor() {
    effect(() => {
      const name = this.appName();
      const title = this.i18n.t('seo.tasks.title', { app: name });
      const description = this.i18n.t('seo.tasks.desc', { app: name });
      this.seo.set({
        title,
        description,
        path: '/tasks/',
        image: 'tasks',
        imageAlt: name,
        lang: this.i18n.lang(),
        jsonLd: [
          { '@context': 'https://schema.org', '@type': 'WebApplication', name, url: SITE_URL + '/tasks/', description, applicationCategory: 'ProductivityApplication', operatingSystem: 'Any', offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' } },
          { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: this.faqs.map((i) => ({ '@type': 'Question', name: this.i18n.t(`tasks.l.q${i}`, { app: name }), acceptedAnswer: { '@type': 'Answer', text: this.i18n.t(`tasks.l.a${i}`, { app: name }) } })) },
        ],
      });
    });
  }
}
