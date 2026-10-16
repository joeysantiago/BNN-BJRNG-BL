import { SITE_URL } from '../../core/site';
import { Repeat } from '../creta/creta.model';
import { APP_SETTINGS } from '../../appSettings';
import { SeoService } from '../../core/seo.service';
import { isPlatformBrowser } from '@angular/common';
import { I18nService } from '../../core/i18n.service';
import { YT_ENDED, YT_PAUSED, YT_PLAYING, YtInput, YtMessage, YtPlayer, YtPlayerApi, YtVideo, YtWindow } from './youtube.model';
import { Component, ElementRef, OnDestroy, PLATFORM_ID, afterNextRender, computed, effect, inject, signal, viewChild } from '@angular/core';

const ID = /^[\w-]{11}$/;
const API = 'https://www.googleapis.com/youtube/v3';
const KEY_STORE = 'thakurg-yt-key';

const fmtTime = (s: number): string => {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

const thumbOf = (id: string): string => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

/** Search results arrive with HTML entities such as &amp;. */
const decode = (s: string): string => new DOMParser().parseFromString(s, 'text/html').documentElement.textContent ?? s;

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

/**
 * Plays YouTube videos with YouTube's own embedded player (IFrame Player API), driven by our controls. The video stays
 * visible and YouTube's ads and terms apply. Nothing has to run on your computer.
 */
@Component({
  selector: 'app-youtube',
  templateUrl: './youtube.html',
  styleUrl: './youtube.scss',
})
export class Youtube implements OnDestroy {
  protected readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly host = viewChild<ElementRef<HTMLElement>>('host');

  /** Searching by name and opening playlists use the YouTube Data API. The key comes from appSettings.ts or is pasted once on the page. */
  protected readonly apiKey = signal(APP_SETTINGS.youtube.apiKey);
  protected readonly canSearch = computed(() => !!this.apiKey());
  protected readonly results = signal<YtVideo[]>([]);
  protected readonly queue = signal<YtVideo[]>([]);
  protected readonly message = signal<YtMessage>('');
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
  protected readonly timeText = computed(() => fmtTime(this.time()));
  protected readonly durationText = computed(() => fmtTime(this.duration()));

  private player: YtPlayer | null = null;
  private apiReady: Promise<YtPlayerApi> | null = null;
  private readonly playerReady = signal(false);
  private loadedId = '';
  private ticker: ReturnType<typeof setInterval> | undefined;
  private wakeLock: WakeLockSentinel | null = null;

  // A wake lock is dropped when the tab is hidden, so ask for it again when the tab returns.
  private onVisible = (): void => {
    if (document.visibilityState === 'visible' && this.playing()) void this.requestWake();
  };

  constructor() {
    if (this.browser && !this.apiKey()) {
      try {
        this.apiKey.set(localStorage.getItem(KEY_STORE) ?? '');
      } catch {
        /* storage blocked: the key just has to be entered again next time */
      }
    }

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

    // Load the chosen video into the player.
    effect(() => {
      const id = this.current()?.id;
      if (id && this.browser) void this.load(id);
    });

    // Keep the player's volume in step with the sliders.
    effect(() => {
      const volume = this.volume();
      const muted = this.muted();
      if (!this.playerReady() || !this.player) return;
      this.player.setVolume(Math.round(volume * 100));
      if (muted) this.player.mute();
      else this.player.unMute();
    });

    afterNextRender(() => {
      this.setupMediaSession();
      document.addEventListener('visibilitychange', this.onVisible);
    });
  }

  // #region Public Methods

  ngOnDestroy(): void {
    clearInterval(this.ticker);
    this.player?.destroy();
    void this.releaseWake();
    if (!this.browser) return;
    document.removeEventListener('visibilitychange', this.onVisible);
    if ('mediaSession' in navigator) navigator.mediaSession.metadata = null;
  }

  // #endregion

  // #region Private Methods

  protected prev(): void {
    const n = this.queue().length;
    if (!n) return;
    if (this.time() > 3) {
      this.player?.seekTo(0, true);
      return;
    }
    this.failed.set(false);
    this.index.set((this.index() - 1 + n) % n);
  }

  protected toggle(): void {
    if (!this.player || !this.current()) return;
    if (this.player.getPlayerState() === YT_PLAYING) this.player.pauseVideo();
    else this.player.playVideo();
  }

  protected cycleRepeat(): void {
    this.repeat.update((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'));
  }

  protected seek(ev: Event): void {
    const to = +(ev.target as HTMLInputElement).value;
    this.player?.seekTo(to, true);
    this.time.set(to);
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
    this.failed.set(false);
    this.index.set(i);
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

  /** Adds a song to the playlist. The first song added starts playing straight away. */
  protected enqueue(v: YtVideo): void {
    if (this.queue().some((q) => q.id === v.id)) return;
    const first = !this.queue().length;
    this.queue.update((q) => [...q, v]);
    if (first) {
      this.index.set(0);
      this.failed.set(false);
    }
  }

  protected saveKey(value: string): void {
    const key = value.trim();
    if (!key) return;
    this.apiKey.set(key);
    this.message.set('');
    try {
      localStorage.setItem(KEY_STORE, key);
    } catch {
      /* storage blocked */
    }
  }

  protected clearKey(): void {
    this.apiKey.set('');
    try {
      localStorage.removeItem(KEY_STORE);
    } catch {
      /* storage blocked */
    }
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
    this.loadedId = '';
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

  /** Loads YouTube's player script the first time a video is played, so nothing is requested from YouTube before that. */
  private loadApi(): Promise<YtPlayerApi> {
    const w = window as unknown as YtWindow;
    if (w.YT?.Player) return Promise.resolve(w.YT);
    return (this.apiReady ??= new Promise((resolve, reject) => {
      w.onYouTubeIframeAPIReady = () => resolve(w.YT!);
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      s.onerror = () => reject(new Error('YouTube player could not be loaded'));
      document.head.appendChild(s);
    }));
  }

  private async load(id: string): Promise<void> {
    if (id === this.loadedId) return;
    this.loadedId = id;
    try {
      const player = await this.ensurePlayer();
      player.loadVideoById(id);
      this.updateMediaMetadata();
    } catch {
      this.failed.set(true);
    }
  }

  private ensurePlayer(): Promise<YtPlayer> {
    if (this.player) return Promise.resolve(this.player);
    return this.loadApi().then(
      (YT) =>
        new Promise<YtPlayer>((resolve) => {
          const holder = document.createElement('div');
          this.host()!.nativeElement.appendChild(holder);
          const player = new YT.Player(holder, {
            host: 'https://www.youtube-nocookie.com',
            width: '100%',
            height: '100%',
            playerVars: { playsinline: 1, rel: 0, controls: 0, disablekb: 1, origin: location.origin },
            events: {
              onReady: () => {
                this.playerReady.set(true);
                resolve(player);
              },
              onStateChange: (e) => this.onState(e.data),
              onError: () => this.failed.set(true),
            },
          });
          this.player = player;
          this.ticker = setInterval(() => this.poll(), 500);
        }),
    );
  }

  /** Time and length come from the player; it offers no event for them. */
  private poll(): void {
    if (!this.player || !this.playerReady()) return;
    this.time.set(this.player.getCurrentTime() || 0);
    this.duration.set(this.player.getDuration() || 0);
  }

  private onState(state: number): void {
    if (state === YT_PLAYING) {
      this.playing.set(true);
      this.failed.set(false);
      void this.requestWake();
    } else if (state === YT_PAUSED) {
      this.playing.set(false);
      void this.releaseWake();
    } else if (state === YT_ENDED) {
      this.playing.set(false);
      if (this.repeat() === 'one') {
        this.player?.seekTo(0, true);
        this.player?.playVideo();
      } else {
        this.next(true);
      }
    }
  }

  private async getJson<T>(url: string): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) throw Object.assign(new Error(String(res.status)), { status: res.status });
    return (await res.json()) as T;
  }

  /** Title and channel of one video, from YouTube's public oEmbed address. No key needed. */
  private async info(id: string): Promise<YtVideo> {
    const link = encodeURIComponent(`https://www.youtube.com/watch?v=${id}`);
    const j = await this.getJson<{ title: string; author_name: string }>(`https://www.youtube.com/oembed?format=json&url=${link}`);
    return { id, title: j.title, artist: j.author_name, duration: 0, thumb: thumbOf(id) };
  }

  private async search(q: string): Promise<YtVideo[]> {
    const url = `${API}/search?part=snippet&type=video&videoEmbeddable=true&maxResults=20&q=${encodeURIComponent(q)}&key=${this.apiKey()}`;
    const j = await this.getJson<{ items: { id: { videoId: string }; snippet: { title: string; channelTitle: string } }[] }>(url);
    return j.items.map((i) => ({ id: i.id.videoId, title: decode(i.snippet.title), artist: decode(i.snippet.channelTitle), duration: 0, thumb: thumbOf(i.id.videoId) }));
  }

  private async playlist(list: string): Promise<YtVideo[]> {
    const url = `${API}/playlistItems?part=snippet&maxResults=50&playlistId=${encodeURIComponent(list)}&key=${this.apiKey()}`;
    const j = await this.getJson<{ items: { snippet: { title: string; videoOwnerChannelTitle?: string; resourceId: { videoId: string } } }[] }>(url);
    return j.items.map((i) => ({ id: i.snippet.resourceId.videoId, title: decode(i.snippet.title), artist: decode(i.snippet.videoOwnerChannelTitle ?? ''), duration: 0, thumb: thumbOf(i.snippet.resourceId.videoId) }));
  }

  protected async submit(text: string): Promise<void> {
    const q = text.trim();
    if (!q || this.busy()) return;
    this.busy.set(true);
    this.message.set('');
    try {
      const found = parseInput(q);
      if (found.list && !found.video && this.canSearch()) this.playNow(await this.playlist(found.list));
      else if (found.video) this.playNow([await this.info(found.video)]);
      else if (found.list || /^https?:\/\//i.test(q)) this.message.set(found.list ? 'needlink' : 'badlink');
      else if (!this.canSearch()) this.message.set('needlink');
      else {
        const list = await this.search(q);
        this.results.set(list);
        if (!list.length) this.message.set('noresults');
      }
    } catch (e) {
      const status = (e as { status?: number }).status;
      this.message.set(status === 400 || status === 403 ? 'badkey' : 'failed');
    } finally {
      this.busy.set(false);
    }
  }

  // #endregion
}
