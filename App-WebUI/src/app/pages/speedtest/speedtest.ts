import { TranslationKey } from '../../i18n/en';
import { Lang, SITE_URL } from '../../core/site';
import { ActivatedRoute } from '@angular/router';
import { SeoService } from '../../core/seo.service';
import { I18nService } from '../../core/i18n.service';
import { ResultsService } from '../../core/results.service';
import { ServiceStatus } from '../../shared/service-status';
import { SpeedResult } from '../../core/models/results.model';
import { SettingsService } from '../../core/settings.service';
import { ShareService, fmtMbps } from '../../core/share.service';
import { ConnectionDetails } from '../../shared/connection-details';
import { PHASE_MS, SpeedEngine } from '../../core/speed-engine.service';
import { Component, OnDestroy, afterNextRender, computed, effect, inject, signal } from '@angular/core';

/** The dial: a 240° ring of bars starting at 150° (lower left), with these speeds marked along it, evenly spaced. */
const ARC_START = 150;
const ARC_SWEEP = 240;
const SEGMENTS = 54;
const GAUGE_STOPS = [0, 5, 10, 25, 50, 75, 100, 250, 500, 1000, 2500, 5000, 10000];
const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
const gaugeAngle = (frac: number) => ARC_START + ARC_SWEEP * frac;
const tickLabel = (mbps: number) => (mbps >= 1000 ? `${mbps / 1000}G` : String(mbps));
const polar = (r: number, deg: number) => [+(120 + r * Math.cos((deg * Math.PI) / 180)).toFixed(1), +(120 + r * Math.sin((deg * Math.PI) / 180)).toFixed(1)];

/** Where a speed sits on the dial (0 to 1): straight lines between the marked speeds. */
const gaugeFraction = (mbps: number): number => {
  const last = GAUGE_STOPS.length - 1;
  const v = Math.min(GAUGE_STOPS[last], Math.max(0, mbps));
  const next = GAUGE_STOPS.findIndex((s) => s > v);
  const i = next < 0 ? last - 1 : next - 1;
  return (i + (v - GAUGE_STOPS[i]) / (GAUGE_STOPS[i + 1] - GAUGE_STOPS[i])) / last;
};

@Component({
  selector: 'app-speedtest',
  imports: [ConnectionDetails, ServiceStatus],
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

  protected readonly cfg = inject(SettingsService);
  protected readonly settings = this.cfg.settings;
  protected readonly fmt = fmtMbps;
  protected readonly shareOpen = signal(false);
  protected readonly saved = signal(false);
  protected readonly copied = signal(false);
  protected readonly dismissed = signal(false);
  protected readonly resultUrl = signal<string | null>(null);
  protected readonly now = signal<number | null>(null);
  private clock: ReturnType<typeof setInterval> | undefined;

  protected readonly clockText = computed(() => {
    const n = this.now();
    return n === null ? '--:--:--' : new Date(n).toLocaleTimeString(this.i18n.lang(), { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  });

  /** Time since the test started. While running it counts up, after a finished test it shows the total. */
  protected readonly elapsedText = computed(() => {
    const start = this.engine.startedAt();
    const n = this.now();
    const phase = this.engine.phase();
    if (!start || n === null || !(this.engine.running() || phase === 'done')) return '0:00';
    const secs = Math.max(0, Math.floor(((phase === 'done' ? (this.engine.finishedAt() ?? n) : n) - start) / 1000));
    return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  });

  /** Whole-test progress in percent: ping 10%, download 45%, upload 45%. */
  protected readonly progress = computed(() => {
    const phase = this.engine.phase();
    if (phase === 'done') return 100;
    const parts: Partial<Record<typeof phase, [number, number, number]>> = { ping: [0, 10, 3000], down: [10, 45, PHASE_MS], up: [55, 45, PHASE_MS] };
    const part = parts[phase];
    const from = this.engine.phaseStartedAt();
    const n = this.now();
    if (!part || from === null || n === null) return 0;
    return Math.round(part[0] + part[1] * Math.min(1, Math.max(0, (n - from) / part[2])));
  });

  /** Plain words for how much the ping grows while the line is busy. */
  protected readonly loadedHint = computed<TranslationKey | null>(() => {
    const loaded = this.engine.loaded();
    const idle = this.engine.ping();
    if (loaded === null || idle === null) return null;
    const extra = loaded - idle;
    return extra < 30 ? 'loaded.good' : extra < 100 ? 'loaded.fair' : 'loaded.bad';
  });

  protected readonly faqs = range(8).map((i) => ({
    q: `faq.${i}.q` as TranslationKey,
    a: `faq.${i}.a` as TranslationKey,
  }));
  protected readonly meanKeys = range(4).map((i) => `info.mean.${i}` as TranslationKey);
  protected readonly accKeys = range(4).map((i) => `info.acc.${i}` as TranslationKey);
  protected readonly fixKeys = range(6).map((i) => `info.fix.${i}` as TranslationKey);

  /** The bars of the ring. --k (0 to 1) blends the lit colour from one end of the ring to the other. */
  protected readonly segments = Array.from({ length: SEGMENTS }, (_, i) => {
    const deg = gaugeAngle(i / (SEGMENTS - 1));
    const [x1, y1] = polar(84, deg);
    const [x2, y2] = polar(100, deg);
    return { k: (i / (SEGMENTS - 1)).toFixed(3), x1, y1, x2, y2 };
  });

  protected readonly labels = GAUGE_STOPS.map((m, i) => {
    const f = i / (GAUGE_STOPS.length - 1);
    const [x, y] = polar(117, gaugeAngle(f));
    return { text: tickLabel(m), f, x, y };
  });

  protected readonly fraction = computed(() => gaugeFraction(this.engine.gauge()));

  /** How many bars are lit; the last lit one is the glowing head. */
  protected readonly lit = computed(() => (this.fraction() > 0.002 ? Math.round(this.fraction() * (SEGMENTS - 1)) + 1 : 0));

  /** The highest speed of the current phase, marked just outside the ring. */
  private readonly peak = signal(0);
  private peakPhase = this.engine.phase();
  protected readonly peakAngle = computed(() => gaugeAngle(gaugeFraction(this.peak())));
  protected readonly peakVisible = computed(() => gaugeFraction(this.peak()) * 100 > 0.2);

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

    afterNextRender(() => {
      this.now.set(Date.now());
      this.clock = setInterval(() => this.now.set(Date.now()), 250);
    });

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

    // Once a test finishes, the dial gives way to the result card drawn as an image.
    effect((onCleanup) => {
      const r = this.current();
      if (!r) {
        this.resultUrl.set(null);
        return;
      }
      let url: string | null = null;
      let stale = false;
      void this.share.image(r).then((blob) => {
        if (!blob || stale)
          return;
        url = URL.createObjectURL(blob);
        this.resultUrl.set(url);
      });
      onCleanup(() => {
        stale = true;
        if (url)
          URL.revokeObjectURL(url);
      });
    });

    // The peak marker starts again with every phase (ping, download, upload).
    effect(() => {
      const phase = this.engine.phase();
      const gauge = this.engine.gauge();
      const same = phase === this.peakPhase;
      this.peakPhase = phase;
      this.peak.update((p) => (same ? Math.max(p, gauge) : gauge));
    });

    // A new connection state re-opens the "No internet access" screen if it was closed.
    effect(() => {
      this.engine.offline();
      this.dismissed.set(false);
    });
  }

  // #region Public Methods

  ngOnDestroy(): void {
    this.stopWatching();
    clearInterval(this.clock);
  }

  // #endregion

  // #region Private Methods

  protected save(): void {
    const r = this.current();
    if (!r || this.saved()) return;
    this.results.save(r);
    this.saved.set(true);
  }

  protected start(): void {
    this.saved.set(false);
    this.shareOpen.set(false);
    this.copied.set(false);
    this.engine.toggle();
  }

  protected image(): void {
    const r = this.current();
    if (r) void this.share.download(r);
  }

  protected onShare(): void {
    this.shareOpen.update((v) => !v);
  }

  protected iso(at: number): string {
    return new Date(at).toISOString();
  }

  protected when(at: number): string {
    return new Date(at).toLocaleString(this.i18n.lang(), { dateStyle: 'medium', timeStyle: 'short' });
  }

  protected async copy(): Promise<void> {
    const r = this.current();
    if (r && (await this.share.copy(r))) {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    }
  }

  protected itemText(r: SpeedResult): string {
    return this.i18n.t('hist.item', { down: fmtMbps(r.down), up: fmtMbps(r.up), ping: Math.round(r.ping), jitter: r.jitter.toFixed(1) });
  }

  /** Open the phone or computer share sheet, with the result image attached when allowed. */
  protected async shareNative(): Promise<void> {
    const r = this.current();
    if (r) await this.share.nativeShare(r);
  }

  // #endregion
}
