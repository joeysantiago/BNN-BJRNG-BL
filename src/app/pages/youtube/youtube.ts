import { SITE_URL } from '../../core/site';
import { Repeat } from '../creta/creta.model';
import { SeoService } from '../../core/seo.service';
import { isPlatformBrowser } from '@angular/common';
import { I18nService } from '../../core/i18n.service';
import { HelperState, YtInput, YtVideo } from './youtube.model';
import { Component, ElementRef, OnDestroy, PLATFORM_ID, afterNextRender, computed, effect, inject, signal, viewChild } from '@angular/core';

/** Helper started with `npm run youtube`. It returns audio-only streams, so no video and no ads are loaded. */
const DEFAULT_HELPER = 'http://127.0.0.1:8787';
const LS_URL = 'yt.helperUrl';
const LS_KEY = 'yt.helperKey';
const ID = /^[\w-]{11}$/;

const lsGet = (k: string): string => {
  try {
    return localStorage.getItem(k) ?? '';
  } catch {
    return '';
  }
};
const lsSet = (k: string, v: string): void => {
  try {
    if (v) localStorage.setItem(k, v);
    else localStorage.removeItem(k);
  } catch {
    /* storage unavailable */
  }
};

const fmtTime = (s: number): string => {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

/** Finds a video or playlist id in a pasted YouTube link, or a bare 11 character video id. */
const parseInput = (text: string): YtInput => {
  const s = text.trim();
  if (ID.test(s)) return { video: s };
  try {
    const u = new URL(s);
    if (!/(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/.test(u.hostname)) return {};
    const list = u.searchParams.get('list') ?? undefined;
    const parts = u.pathname.split('/').filter(Boolean);
    const v = u.hostname.endsWith('youtu.be') ? parts[0] : (u.searchParams.get('v') ?? (['shorts', 'embed', 'live'].includes(parts[0]) ? parts[1] : undefined));
    return { video: v && ID.test(v) ? v : undefined, list };
  } catch {
    return {};
  }
};

@Component({
  selector: 'app-youtube',
  templateUrl: './youtube.html',
  styleUrl: './youtube.scss',
})
export class Youtube implements OnDestroy {
  protected readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly audioRef = viewChild<ElementRef<HTMLAudioElement>>('audio');

  protected readonly helper = signal<HelperState>('checking');
  protected readonly helperUrl = signal(DEFAULT_HELPER);
  protected readonly helperKey = signal('');
  protected readonly setupOpen = signal(false);
  protected readonly results = signal<YtVideo[]>([]);
  protected readonly queue = signal<YtVideo[]>([]);
  protected readonly message = signal<'' | 'noresults' | 'failed' | 'badlink'>('');
  protected readonly busy = signal(false);
  protected readonly index = signal(0);
  protected readonly playing = signal(false);
  protected readonly time = signal(0);
  protected readonly duration = signal(0);
  protected readonly volume = signal(0.8);
  protected readonly muted = signal(false);
  protected readonly shuffle = signal(false);
  protected readonly repeat = signal<Repeat>('off');
  protected readonly failed = signal(false);

  protected readonly current = computed(() => this.queue()[this.index()] ?? null);
  protected readonly src = computed(() => {
    const t = this.current();
    return t ? this.api(`/api/stream/${t.id}`) : null;
  });
  protected readonly timeText = computed(() => fmtTime(this.time()));
  protected readonly durationText = computed(() => fmtTime(this.duration()));

  protected autoplay = false;
  private wakeLock: WakeLockSentinel | null = null;

  // A wake lock is dropped when the tab is hidden, so ask for it again when the tab returns.
  private onVisible = (): void => {
    if (document.visibilityState === 'visible' && this.playing()) void this.requestWake();
  };

  constructor() {
    effect(() => {
      this.seo.set({
        title: this.i18n.t('seo.yt.title'),
        description: this.i18n.t('seo.yt.desc'),
        path: '/youtube/',
        image: 'youtube',
        lang: this.i18n.lang(),
        imageAlt: this.i18n.t('yt.h1'),
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: this.i18n.t('yt.h1'),
            url: `${SITE_URL}/youtube/`,
            applicationCategory: 'MultimediaApplication',
            operatingSystem: 'Any',
            description: this.i18n.t('seo.yt.desc'),
            image: `${SITE_URL}/og/youtube.png`,
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          },
        ],
      });
    });

    // Keep the audio element's volume in step with the sliders.
    effect(() => {
      const a = this.audioRef()?.nativeElement;
      if (!a) return;
      a.volume = this.volume();
      a.muted = this.muted();
    });

    afterNextRender(() => {
      this.helperUrl.set(lsGet(LS_URL) || DEFAULT_HELPER);
      this.helperKey.set(lsGet(LS_KEY));
      void this.checkHelper();
      this.setupMediaSession();
      document.addEventListener('visibilitychange', this.onVisible);
    });
  }

  // #region Public Methods

  ngOnDestroy(): void {
    this.audioRef()?.nativeElement.pause();
    void this.releaseWake();
    if (!this.browser) return;
    document.removeEventListener('visibilitychange', this.onVisible);
    if ('mediaSession' in navigator) navigator.mediaSession.metadata = null;
  }

  // #endregion

  // #region Private Methods

  protected prev(): void {
    const a = this.audioRef()?.nativeElement;
    const n = this.queue().length;
    if (!n) return;
    if (a && a.currentTime > 3) {
      a.currentTime = 0;
      return;
    }
    this.autoplay = true;
    this.index.set((this.index() - 1 + n) % n);
  }

  protected toggle(): void {
    const a = this.audioRef()?.nativeElement;
    if (!a || !this.current()) return;
    if (a.paused) void a.play().catch(() => this.failed.set(true));
    else a.pause();
  }

  protected onPlay(): void {
    this.playing.set(true);
    void this.requestWake();
  }

  protected onError(): void {
    if (this.current()) this.failed.set(true);
  }

  protected onPause(): void {
    this.playing.set(false);
    void this.releaseWake();
  }

  protected cycleRepeat(): void {
    this.repeat.update((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'));
  }

  protected onTrackChange(): void {
    this.time.set(0);
    this.duration.set(0);
    this.updateMediaMetadata();
  }

  protected seek(ev: Event): void {
    const a = this.audioRef()?.nativeElement;
    if (a) a.currentTime = +(ev.target as HTMLInputElement).value;
  }

  private setupMediaSession(): void {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    ms.setActionHandler('play', () => this.toggle());
    ms.setActionHandler('pause', () => this.toggle());
    ms.setActionHandler('previoustrack', () => this.prev());
    ms.setActionHandler('nexttrack', () => this.next());
  }

  protected choose(i: number): void {
    if (i === this.index()) {
      this.toggle();
      return;
    }
    this.autoplay = true;
    this.failed.set(false);
    this.index.set(i);
  }

  private api(path: string): string {
    const key = this.helperKey();
    return this.helperUrl() + path + (key ? `${path.includes('?') ? '&' : '?'}key=${encodeURIComponent(key)}` : '');
  }

  protected next(auto = false): void {
    const n = this.queue().length;
    if (!n) return;
    let i: number;
    if (this.shuffle() && n > 1) {
      do i = Math.floor(Math.random() * n);
      while (i === this.index());
    } else {
      i = this.index() + 1;
      if (i >= n) {
        if (auto && this.repeat() === 'off') {
          this.playing.set(false);
          return;
        }
        i = 0;
      }
    }
    this.autoplay = true;
    this.failed.set(false);
    this.index.set(i);
  }

  private updateMediaMetadata(): void {
    const t = this.current();
    if (!this.browser || !('mediaSession' in navigator) || !t) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: 'YouTube', artwork: [{ src: t.thumb }] });
  }

  protected removeAt(i: number): void {
    const current = this.index();
    this.queue.update((q) => q.filter((_, n) => n !== i));
    if (i < current) this.index.update((n) => n - 1);
    else if (i === current) this.index.set(Math.min(i, Math.max(0, this.queue().length - 1)));
  }

  protected enqueue(v: YtVideo): void {
    if (!this.queue().some((q) => q.id === v.id)) this.queue.update((q) => [...q, v]);
  }

  protected setVolume(ev: Event): void {
    this.volume.set(+(ev.target as HTMLInputElement).value);
    this.muted.set(false);
  }

  protected playResult(v: YtVideo): void {
    this.enqueue(v);
    this.choose(this.queue().findIndex((q) => q.id === v.id));
  }

  protected fmt(seconds: number): string {
    return seconds ? fmtTime(seconds) : '';
  }

  private playNow(list: YtVideo[]): void {
    if (!list.length) {
      this.message.set('noresults');
      return;
    }
    this.queue.set(list);
    this.index.set(0);
    this.failed.set(false);
    this.autoplay = true;
  }

  private async requestWake(): Promise<void> {
    if (!this.browser || !('wakeLock' in navigator) || this.wakeLock) return;
    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      this.wakeLock.addEventListener('release', () => (this.wakeLock = null));
    } catch {
      /* not allowed right now (for example, the tab is hidden) */
    }
  }

  private async releaseWake(): Promise<void> {
    await this.wakeLock?.release().catch(() => undefined);
    this.wakeLock = null;
  }

  private async checkHelper(): Promise<void> {
    try {
      await this.get('/api/health');
      this.helper.set('up');
    } catch {
      this.helper.set('down');
    }
  }

  protected onEnded(a: HTMLAudioElement): void {
    if (this.repeat() === 'one') {
      a.currentTime = 0;
      void a.play();
    } else {
      this.next(true);
    }
  }

  protected onLoaded(a: HTMLAudioElement): void {
    this.duration.set(a.duration || 0);
    if (this.autoplay) {
      this.autoplay = false;
      void a.play().catch(() => undefined);
    }
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(this.api(path));
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as T;
  }

  protected async submit(text: string): Promise<void> {
    const q = text.trim();
    if (!q || this.busy() || this.helper() !== 'up') return;
    this.busy.set(true);
    this.message.set('');
    try {
      const found = parseInput(q);
      if (found.list) {
        const list = await this.get<YtVideo[]>(`/api/playlist/${encodeURIComponent(found.list)}`);
        this.playNow(list);
      } else if (found.video) {
        this.playNow([await this.get<YtVideo>(`/api/info/${found.video}`)]);
      } else if (/^https?:\/\//i.test(q)) {
        this.message.set('badlink');
      } else {
        const list = await this.get<YtVideo[]>(`/api/search?q=${encodeURIComponent(q)}`);
        this.results.set(list);
        if (!list.length) this.message.set('noresults');
      }
    } catch {
      this.message.set('failed');
    } finally {
      this.busy.set(false);
    }
  }

  protected saveSetup(url: string, key: string): void {
    const clean = url.trim().replace(/\/+$/, '');
    const ok = /^https?:\/\/[^\s/]+$/i.test(clean);
    this.helperUrl.set(ok ? clean : DEFAULT_HELPER);
    this.helperKey.set(key.trim());
    lsSet(LS_URL, ok && clean !== DEFAULT_HELPER ? clean : '');
    lsSet(LS_KEY, this.helperKey());
    this.setupOpen.set(false);
    this.helper.set('checking');
    void this.checkHelper();
  }

  // #endregion
}
