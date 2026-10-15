import { Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslationKey } from '../../i18n/en';
import { I18nService } from '../../core/i18n.service';
import { ResultsService, SpeedResult } from '../../core/results.service';
import { SeoService } from '../../core/seo.service';
import { ShareService, fmtMbps } from '../../core/share.service';
import { Lang, SITE_URL } from '../../core/site';
import { SpeedEngine, gaugeFraction } from '../../core/speed-engine.service';

const TICKS = [0, 5, 25, 100, 500, 1000];
const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

@Component({
  selector: 'app-speedtest',
  imports: [],
  templateUrl: './speedtest.html',
  styleUrl: './speedtest.scss',
})
export class Speedtest implements OnDestroy {
  protected readonly i18n = inject(I18nService);
  protected readonly engine = inject(SpeedEngine);
  protected readonly results = inject(ResultsService);
  protected readonly share = inject(ShareService);
  private readonly seo = inject(SeoService);
  private readonly stopWatching: () => void;

  protected readonly fmt = fmtMbps;
  protected readonly shareOpen = signal(false);
  protected readonly saved = signal(false);
  protected readonly copied = signal(false);
  protected readonly dismissed = signal(false);

  protected readonly faqs = range(8).map((i) => ({
    q: `faq.${i}.q` as TranslationKey,
    a: `faq.${i}.a` as TranslationKey,
  }));
  protected readonly meanKeys = range(4).map((i) => `info.mean.${i}` as TranslationKey);
  protected readonly accKeys = range(4).map((i) => `info.acc.${i}` as TranslationKey);
  protected readonly fixKeys = range(6).map((i) => `info.fix.${i}` as TranslationKey);

  /** Arc fill, as a share of the 270 degree dial (pathLength is 100). */
  protected readonly dash = computed(() => (gaugeFraction(this.engine.gauge()) * 100).toFixed(2));
  protected readonly arcVisible = computed(() => gaugeFraction(this.engine.gauge()) * 100 > 0.2);

  protected readonly ticks = TICKS.map((m) => {
    const a = ((135 + 270 * gaugeFraction(m)) * Math.PI) / 180;
    return { label: m >= 1000 ? '1G' : String(m), x: +(120 + 116 * Math.cos(a)).toFixed(1), y: +(120 + 116 * Math.sin(a) + 4).toFixed(1) };
  });

  protected readonly status = computed(() => {
    switch (this.engine.phase()) {
      case 'ping':
        return this.i18n.t('st.ping_phase');
      case 'down':
        return this.i18n.t('st.down_phase');
      case 'up':
        return this.i18n.t('st.up_phase');
      case 'done': {
        const at = this.engine.finishedAt();
        const time = at ? new Date(at).toLocaleTimeString(this.i18n.lang(), { hour: '2-digit', minute: '2-digit' }) : '';
        return this.i18n.t('st.complete', { time });
      }
      case 'stopped':
        return this.i18n.t('st.stopped');
      case 'error':
        return this.i18n.t('st.nonet');
      default:
        return this.i18n.t('st.ready');
    }
  });

  protected readonly unit = computed(() => {
    const p = this.engine.phase();
    if (p === 'down' || p === 'done') return this.i18n.t('unit.mbps_down');
    if (p === 'up') return this.i18n.t('unit.mbps_up');
    return this.i18n.t('unit.mbps');
  });

  protected readonly buttonLabel = computed(() => {
    if (this.engine.running()) return this.i18n.t('st.stop');
    return this.engine.phase() === 'idle' ? this.i18n.t('st.start') : this.i18n.t('st.again');
  });

  /** The finished result, ready to share or save. */
  protected readonly current = computed<Omit<SpeedResult, 'id'> | null>(() => {
    if (!this.engine.hasResult()) return null;
    return {
      at: this.engine.finishedAt() ?? Date.now(),
      down: this.engine.down()!,
      up: this.engine.up()!,
      ping: this.engine.ping()!,
      jitter: this.engine.jitter()!,
    };
  });

  protected readonly shareLinks = computed(() => {
    const r = this.current();
    return r ? this.share.links(r) : [];
  });

  constructor() {
    const lang = inject(ActivatedRoute).snapshot.data['lang'] as Lang;
    this.i18n.set(lang, false);
    this.stopWatching = this.engine.watchConnection();

    effect(() => {
      const l = this.i18n.lang();
      const path = this.i18n.info().home;
      this.seo.set({
        title: this.i18n.t('seo.home.title'),
        description: this.i18n.t('seo.home.desc'),
        path,
        image: 'speedtest',
        lang: l,
        imageAlt: 'Internet speed test gauge showing download, upload, ping and jitter',
        alternates: { en: '/', hi: '/hi/', ar: '/ar/' },
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: this.i18n.t('seo.home.title'),
            url: SITE_URL + path,
            inLanguage: l,
            applicationCategory: 'UtilitiesApplication',
            operatingSystem: 'Any',
            browserRequirements: 'Requires JavaScript',
            description: this.i18n.t('seo.home.desc'),
            image: `${SITE_URL}/og/speedtest.png`,
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            inLanguage: l,
            mainEntity: this.faqs.map((f) => ({
              '@type': 'Question',
              name: this.i18n.t(f.q),
              acceptedAnswer: { '@type': 'Answer', text: this.i18n.t(f.a) },
            })),
          },
        ],
      });
    });

    // A new connection state re-opens the "No internet access" screen if it was closed.
    effect(() => {
      this.engine.offline();
      this.dismissed.set(false);
    });
  }

  ngOnDestroy(): void {
    this.stopWatching();
  }

  protected start(): void {
    this.saved.set(false);
    this.shareOpen.set(false);
    this.copied.set(false);
    this.engine.toggle();
  }

  protected save(): void {
    const r = this.current();
    if (!r || this.saved()) return;
    this.results.save(r);
    this.saved.set(true);
  }

  protected onShare(): void {
    this.shareOpen.update((v) => !v);
  }

  /** Open the phone or computer share sheet, with the result image attached when allowed. */
  protected async shareNative(): Promise<void> {
    const r = this.current();
    if (r) await this.share.nativeShare(r);
  }

  protected async copy(): Promise<void> {
    const r = this.current();
    if (r && (await this.share.copy(r))) {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    }
  }

  protected image(): void {
    const r = this.current();
    if (r) void this.share.download(r);
  }

  protected iso(at: number): string {
    return new Date(at).toISOString();
  }

  protected when(at: number): string {
    return new Date(at).toLocaleString(this.i18n.lang(), { dateStyle: 'medium', timeStyle: 'short' });
  }

  protected itemText(r: SpeedResult): string {
    return this.i18n.t('hist.item', { down: fmtMbps(r.down), up: fmtMbps(r.up), ping: Math.round(r.ping), jitter: r.jitter.toFixed(1) });
  }
}
