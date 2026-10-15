import { Component, effect, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n.service';
import { SeoService } from '../../core/seo.service';
import { SITE_URL } from '../../core/site';

/**
 * Atrium HR. The app is a self-contained page (public/atrium/app.html) shown full screen in a frame, so its own
 * styles, timers and key handlers never leak into the rest of the site. The text below the app is what search
 * engines and visitors read about it.
 */
@Component({
  selector: 'app-atrium',
  imports: [RouterLink],
  templateUrl: './atrium.html',
  styleUrl: './atrium.scss',
})
export class Atrium {
  private readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);

  protected readonly src: SafeResourceUrl = inject(DomSanitizer).bypassSecurityTrustResourceUrl('/atrium/app.html');

  protected readonly features = [
    { h: 'Employees', p: 'Profiles, departments, employment types and documents in one directory.' },
    { h: 'Attendance', p: 'Daily attendance, a monthly muster and employee check-in with a selfie and geofence.' },
    { h: 'Leave', p: 'Leave types, balances, requests and approvals with a clear policy.' },
    { h: 'Payroll', p: 'Monthly pay runs with basic pay, HRA, PF, ESI, professional tax and TDS, plus payslips.' },
    { h: 'Hiring', p: 'Job openings, a candidate pipeline, interviews with feedback, and offers with onboarding.' },
    { h: 'Reports', p: 'Attendance trends, headcount by department, hiring funnel and cost charts.' },
  ];

  constructor() {
    this.i18n.set('en', false); // the Atrium app is in English
    effect(() => {
      this.seo.set({
        title: this.i18n.t('seo.hr.title'),
        description: this.i18n.t('seo.hr.desc'),
        path: '/HR/',
        image: 'hr',
        lang: 'en',
        imageAlt: 'Atrium HR dashboard for attendance, leave and payroll',
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Atrium HR',
            url: `${SITE_URL}/HR/`,
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Any',
            description: this.i18n.t('seo.hr.desc'),
            image: `${SITE_URL}/og/hr.png`,
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          },
        ],
      });
    });
  }
}
