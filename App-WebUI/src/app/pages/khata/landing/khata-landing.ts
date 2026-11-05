import { RouterLink } from '@angular/router';
import { SITE_URL } from '../../../core/site';
import { SeoService } from '../../../core/seo.service';
import { SiteTools } from '../../../shared/site-tools';
import { KhataIcon } from '../ui/khata-icon/khata-icon';
import { AuthService } from '../../../core/auth.service';
import { I18nService } from '../../../core/i18n.service';
import { formatMoney } from '../../../core/khata-format';
import { ThemeService } from '../../../core/theme.service';
import { AppPwaService } from '../../../core/app-pwa.service';
import { KhataStyleService } from '../../../core/khata-style.service';
import { Component, OnDestroy, computed, effect, inject } from '@angular/core';
import { KhataCurrency, KhataLandingFeature } from '../../../core/models/khata.model';

const PATH = '/khata/';
const FAQ = ['q1', 'q2', 'q3', 'q4'];
/** The sample ledger card in the hero is drawn in rupees, whatever the reader's language. */
const SAMPLE_CURRENCY: KhataCurrency = { id: 0, code: 'INR', name: 'Indian rupee', isIso: true, symbol: '₹', decimals: 0, isCustom: false };

/**
 * /khata: the public, prerendered SnapKhata page for visitors and search engines, full screen in the SnapKhata design (light and dark).
 * The app itself is behind login at /khata/app. While this page is open, "Install app" installs SnapKhata on the phone.
 */
@Component({
  selector: 'app-khata-landing',
  imports: [RouterLink, KhataIcon, SiteTools],
  templateUrl: './khata-landing.html',
  styleUrl: './khata-landing.scss',
})

export class KhataLanding implements OnDestroy {
  protected readonly faq = FAQ;
  private readonly seo = inject(SeoService);
  private readonly pwa = inject(AppPwaService);
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  protected readonly theme = inject(ThemeService);
  protected readonly year = new Date().getFullYear();
  protected readonly style = inject(KhataStyleService);
  protected readonly features: KhataLandingFeature[] = [{ icon: 'users', key: 'f1' }, { icon: 'zap', key: 'f2' }, { icon: 'book', key: 'f3' }, { icon: 'lock', key: 'f4' }, { icon: 'history', key: 'f5' }];
  protected readonly sample = computed(() => {
    const lang = this.i18n.lang();
    const money = (rupees: number): string => formatMoney(rupees, SAMPLE_CURRENCY, lang);
    return { total: money(458050), rows: [{ key: 'khata.l.mockA', amount: money(158000) }, { key: 'khata.l.mockB', amount: money(32050) }, { key: 'khata.l.mockC', amount: money(268000) }], gave: money(500), got: money(2000) };
  });

  constructor() {
    this.style.load();
    this.pwa.enter('khata');
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

  // #region Public Methods

  ngOnDestroy(): void {
    this.pwa.leave();
  }

  // #endregion
}
