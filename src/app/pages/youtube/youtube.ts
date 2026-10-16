import { SITE_URL } from '../../core/site';
import { Repeat } from '../creta/creta.model';
import { APP_SETTINGS } from '../../appSettings';
import { SeoService } from '../../core/seo.service';
import type { TranslationKey } from '../../i18n/en';
import { isPlatformBrowser } from '@angular/common';
import { I18nService } from '../../core/i18n.service';
import { YT_ENDED, YT_PAUSED, YT_PLAYING, YtInput, YtMessage, YtPlayer, YtPlayerApi, YtPlaylist, YtVideo, YtWindow } from './youtube.model';
import { Component, ElementRef, OnDestroy, PLATFORM_ID, afterNextRender, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';

const ID = /^[\w-]{11}$/;
const API = 'https://www.googleapis.com/youtube/v3';
const KEY_STORE = 'thakurg-yt-key';
const VIDEO_STORE = 'thakurg-yt-video';
const SERVER_STORE = 'thakurg-yt-server';
const TOKEN_STORE = 'thakurg-yt-token';
const LISTS_STORE = 'thakurg-yt-playlists';
const TIP_STORE = 'thakurg-yt-tip';
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/;

const MESSAGE_KEYS: Record<Exclude<YtMessage, ''>, TranslationKey> = {
  noresults: 'yt.noresults',
  badlink: 'yt.badlink',
  needlink: 'yt.needlink',
  badkey: 'yt.badkey',
  failed: 'yt.failed',
  noserver: 'yt.noserver',
  serverdown: 'yt.serverdown',
  serverkey: 'yt.serverkey',
  noplaylist: 'yt.pl.pick',
};

const newId = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const fmtTime = (s: number): string => {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

const QUALITY_LABELS: Record<string, string> = { tiny: '144p', small: '240p', medium: '360p', large: '480p', hd720: '720p', hd1080: '1080p', hd1440: '1440p', hd2160: '2160p', highres: '4320p' };

const thumbOf =(id: string): string => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

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
  protected readonly showVideo = signal(true);
  protected readonly quality = signal('auto');
  protected readonly qualities = signal<string[]>([]);
  protected canFullscreen = false;
  protected readonly serverUrl = signal(APP_SETTINGS.youtube.server);
  protected readonly serverToken = signal(APP_SETTINGS.youtube.token);
  protected readonly playlists = signal<YtPlaylist[]>([]);
  protected readonly target = signal('');
  protected readonly showTip = signal(false);
  protected readonly downloading = signal('');
  protected readonly openList = signal('');
  /** True while the song plays from the helper server through a normal audio element, which phones keep playing in the background. */
  protected readonly audioMode = signal(false);

  protected readonly current = computed(() => this.queue()[this.index()] ?? null);
  protected readonly timeText = computed(() => fmtTime(this.time()));
  protected readonly durationText = computed(() => fmtTime(this.duration()));

  private player: YtPlayer | null = null;
  private apiReady: Promise<YtPlayerApi> | null = null;
  private readonly playerReady = signal(false);
  private loadedId = '';
  private ticker: ReturnType<typeof setInterval> | undefined;
  private wakeLock: WakeLockSentinel | null = null;
  private keepAlive: HTMLAudioElement | null = null;
  private audio: HTMLAudioElement | null = null;
  private startAt = 0;
  private serverOk = false;
  private autoAudio = false;
  private wantPlay = false;

  // A wake lock is dropped when the tab is hidden, so ask for it again when the tab returns.
  private onVisible = (): void => {
    if (document.visibilityState === 'hidden') this.handOff();
    else if (this.autoAudio) this.handBack();
    if (document.visibilityState === 'visible' && this.playing()) void this.requestWake();
    // Phones pause embedded players when the page is hidden; start again if the listener never asked to pause.
    if (!this.audioMode() && this.wantPlay && this.player && this.player.getPlayerState() === YT_PAUSED)
      this.player.playVideo();
  };

  constructor() {
    if (this.browser) {
      this.canFullscreen = !!document.fullscreenEnabled;
      try {
        if (!this.serverUrl()) this.serverUrl.set(localStorage.getItem(SERVER_STORE) ?? '');
        if (!this.serverToken()) this.serverToken.set(localStorage.getItem(TOKEN_STORE) ?? '');
        this.playlists.set(JSON.parse(localStorage.getItem(LISTS_STORE) ?? '[]') as YtPlaylist[]);
        this.target.set(this.playlists()[0]?.id ?? '');
        this.showTip.set(matchMedia('(pointer: coarse)').matches && localStorage.getItem(TIP_STORE) !== '1');
      } catch {
        /* storage blocked or unreadable: start with no saved playlists */
      }
      try {
        if (!this.apiKey()) this.apiKey.set(localStorage.getItem(KEY_STORE) ?? '');
        this.showVideo.set(localStorage.getItem(VIDEO_STORE) !== '0');
      } catch {
        /* storage blocked: the key just has to be entered again next time */
      }
    }

    // Playlists are kept in this browser.
    effect(() => {
      const lists = this.playlists();
      if (!this.browser) return;
      try {
        localStorage.setItem(LISTS_STORE, JSON.stringify(lists));
      } catch {
        /* storage blocked */
      }
    });

    // Switching the video off or on changes the requested picture quality.
    effect(() => {
      this.showVideo();
      this.quality();
      this.applyQuality();
    });

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
      if (id && this.browser) untracked(() => void this.start(id));
    });

    // Keep the player's volume in step with the sliders.
    effect(() => {
      const volume = this.volume();
      const muted = this.muted();
      if (this.audio) {
        this.audio.volume = volume;
        this.audio.muted = muted;
      }
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
    this.keepAlive?.pause();
    this.audio?.pause();
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
      this.seekTo(0);
      return;
    }
    this.failed.set(false);
    this.index.set((this.index() - 1 + n) % n);
  }

  protected toggle(): void {
    if (!this.current()) return;
    if (this.audioMode()) {
      const a = this.audioEl();
      this.wantPlay = a.paused;
      if (a.paused) void a.play().catch(() => undefined);
      else a.pause();
      return;
    }
    if (!this.player) return;
    if (this.player.getPlayerState() === YT_PLAYING) {
      this.wantPlay = false;
      this.player.pauseVideo();
    } else {
      this.wantPlay = true;
      this.player.playVideo();
    }
  }

  protected async toggleVideo(): Promise<void> {
    this.autoAudio = false;
    this.showVideo.update((v) => !v);
    try {
      localStorage.setItem(VIDEO_STORE, this.showVideo() ? '1' : '0');
    } catch {
      /* storage blocked */
    }
    if (this.showVideo()) this.leaveAudio();
    else await this.enterAudio();
  }

  private audioEl(): HTMLAudioElement {
    if (this.audio) return this.audio;
    const a = new Audio();
    a.preload = 'auto';
    a.volume = this.volume();
    a.muted = this.muted();
    const ms = (): MediaSession | null => ('mediaSession' in navigator ? navigator.mediaSession : null);
    a.addEventListener('play', () => {
      if (!this.audioMode()) return;
      this.playing.set(true);
      this.failed.set(false);
      const m = ms();
      if (m) m.playbackState = 'playing';
    });
    a.addEventListener('pause', () => {
      if (!this.audioMode() || a.ended) return;
      this.playing.set(false);
      const m = ms();
      if (m) m.playbackState = 'paused';
    });
    a.addEventListener('timeupdate', () => {
      if (this.audioMode()) this.time.set(a.currentTime || 0);
    });
    const length = (): void => {
      if (this.audioMode()) this.duration.set(Number.isFinite(a.duration) ? a.duration : 0);
    };
    a.addEventListener('durationchange', length);
    a.addEventListener('loadedmetadata', length);
    a.addEventListener('ended', () => {
      if (!this.audioMode()) return;
      this.playing.set(false);
      if (this.repeat() === 'one') {
        a.currentTime = 0;
        void a.play().catch(() => undefined);
      } else {
        this.next(true);
      }
    });
    // The helper could not serve the song: go back to YouTube's player so the song still plays.
    a.addEventListener('error', () => {
      if (!this.audioMode()) return;
      this.message.set('serverdown');
      this.leaveAudio();
    });
    return (this.audio = a);
  }

  /** Whether the helper server answers. A network error means it is not running or the address is wrong. */
  private async audioReachable(): Promise<boolean> {
    return (await this.ping()) === 'ok';
  }

  /** Asks the helper if it is up. A readable 401 means the key is wrong; a blocked read still proves the server answers. */
  private async ping(): Promise<'ok' | 'down' | 'key'> {
    const base = this.serverBase();
    if (!base) return 'down';
    const url = `${base}/api/health${this.keyQuery()}`;
    try {
      const res = await fetch(url);
      this.serverOk = res.status !== 401;
      return res.status === 401 ? 'key' : 'ok';
    } catch {
      try {
        await fetch(url, { mode: 'no-cors' });
        this.serverOk = true;
        return 'ok';
      } catch {
        this.serverOk = false;
        return 'down';
      }
    }
  }

  /** The page is going to the background: switch to the helper's audio, which phones keep playing with the screen off. */
  private handOff(): void {
    const id = this.current()?.id;
    if (!id || !this.serverOk || this.audioMode() || !this.playing() || !this.serverBase()) return;
    const at = this.player?.getCurrentTime() ?? 0;
    this.autoAudio = true;
    this.audioMode.set(true);
    this.player?.pauseVideo();
    this.loadAudio(id, at, true);
  }

  /** The page is back in front: give the song back to YouTube's player at the same position. */
  private handBack(): void {
    this.autoAudio = false;
    if (this.showVideo()) this.leaveAudio();
  }

  private keyQuery(): string {
    return this.serverToken() ? `?key=${encodeURIComponent(this.serverToken())}` : '';
  }

  /** Audio only: hand the song over from YouTube's player to the helper server's audio, which keeps playing in the background. */
  private async enterAudio(): Promise<void> {
    if (!this.serverBase()) {
      this.message.set('noserver');
      return;
    }
    const state = await this.ping();
    if (state !== 'ok') {
      this.message.set(state === 'key' ? 'serverkey' : 'serverdown');
      return;
    }
    if (this.showVideo()) return;
    this.message.set('');
    const id = this.current()?.id;
    const at = this.player?.getCurrentTime() ?? 0;
    const was = this.playing() || this.wantPlay;
    this.audioMode.set(true);
    this.player?.pauseVideo();
    if (id) this.loadAudio(id, at, was);
  }

  /** Video on again: hand the song back to YouTube's player at the same position. */
  private leaveAudio(): void {
    if (!this.audioMode()) return;
    const a = this.audio;
    this.startAt = a?.currentTime ?? 0;
    this.audioMode.set(false);
    if (a) {
      a.pause();
      a.removeAttribute('src');
      a.load();
    }
    const id = this.current()?.id;
    this.loadedId = '';
    if (id) void this.load(id);
  }

  private loadAudio(id: string, at = 0, play = true): void {
    const a = this.audioEl();
    a.src = `${this.serverBase()}/api/stream/${id}${this.keyQuery()}`;
    if (at > 1) a.addEventListener('loadedmetadata', () => (a.currentTime = at), { once: true });
    this.wantPlay = play;
    this.updateMediaMetadata();
    if (play) void a.play().catch(() => this.playing.set(false));
  }

  /** Picks the player for a newly chosen song: the helper's audio when video is off and the helper answers, else YouTube's player. */
  private async start(id: string): Promise<void> {
    if (!this.showVideo() && !this.audioMode() && (await this.audioReachable())) this.audioMode.set(true);
    if (this.audioMode()) this.loadAudio(id);
    else await this.load(id);
  }

  private seekTo(to: number): void {
    if (this.audioMode()) this.audioEl().currentTime = to;
    else this.player?.seekTo(to, true);
  }

  /** Asks YouTube for its smallest picture while the video is off. YouTube treats this as a hint and may ignore it. */
  private applyQuality(): void {
    if (!this.playerReady() || !this.player) return;
    const q = this.quality();
    this.player.setPlaybackQuality(!this.showVideo() ? 'tiny' : q === 'auto' ? 'default' : q);
  }

  protected fullscreen(): void {
    const box = this.host()?.nativeElement.parentElement;
    if (document.fullscreenElement)
      void document.exitFullscreen();
    else
      void box?.requestFullscreen().catch(() => undefined);
  }

  protected qualityLabel(level: string): string {
    return QUALITY_LABELS[level] ?? level;
  }

  protected setQuality(ev: Event): void {
    this.quality.set((ev.target as HTMLSelectElement).value);
    this.applyQuality();
  }

  /** A looping silent clip keeps the page registered as a media player, so phones are less eager to suspend it in the background. */
  private startKeepAlive(): void {
    if (!this.browser) return;
    if (!this.keepAlive) {
      const bytes = new Uint8Array(44 + 8000).fill(128);
      const dv = new DataView(bytes.buffer);
      const tag = (o: number, s: string): void => [...s].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
      tag(0, 'RIFF');
      dv.setUint32(4, 36 + 8000, true);
      tag(8, 'WAVEfmt ');
      dv.setUint32(16, 16, true);
      dv.setUint16(20, 1, true);
      dv.setUint16(22, 1, true);
      dv.setUint32(24, 8000, true);
      dv.setUint32(28, 8000, true);
      dv.setUint16(32, 1, true);
      dv.setUint16(34, 8, true);
      tag(36, 'data');
      dv.setUint32(40, 8000, true);
      let bin = '';
      bytes.forEach((b) => (bin += String.fromCharCode(b)));
      this.keepAlive = new Audio(`data:audio/wav;base64,${btoa(bin)}`);
      this.keepAlive.loop = true;
      this.keepAlive.volume = 0.01;
    }
    void this.keepAlive.play().catch(() => undefined);
  }

  protected cycleRepeat(): void {
    this.repeat.update((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'));
  }

  protected seek(ev: Event): void {
    const to = +(ev.target as HTMLInputElement).value;
    this.seekTo(to);
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

  /** Downloads the song as a 320 kbps MP3 made by the helper server and saves it on this device, phone or computer. */
  protected async download(v: YtVideo): Promise<void> {
    const base = this.serverBase();
    if (!base) {
      this.message.set('noserver');
      return;
    }
    const state = await this.ping();
    if (state !== 'ok') {
      this.message.set(state === 'key' ? 'serverkey' : 'serverdown');
      return;
    }
    this.message.set('');
    const link = `${base}/api/download/${v.id}${this.keyQuery()}`;
    const name = `${v.title.replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 80) || v.id}.mp3`;
    this.downloading.set(v.id);
    try {
      const res = await fetch(link);
      if (!res.ok) throw new Error(String(res.status));
      this.save(URL.createObjectURL(await res.blob()), name, true);
    } catch (e) {
      // The browser may not be allowed to read the reply (the page's address is not in YT_ORIGINS): let it download the link itself.
      if (e instanceof TypeError) this.save(link, name, false);
      else this.message.set('failed');
    } finally {
      this.downloading.set('');
    }
  }

  private save(href: string, name: string, revoke: boolean): void {
    const a = document.createElement('a');
    a.href = href;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (revoke) setTimeout(() => URL.revokeObjectURL(href), 60000);
  }

  /** The saved address, or the page's own host on port 8787 when testing on this computer or home network. Empty when unknown. */
  private serverBase(): string {
    const saved = this.serverUrl().trim();
    if (saved) return saved.replace(/\/$/, '');
    return LOCAL_HOST.test(location.hostname) ? `${location.protocol}//${location.hostname}:8787` : '';
  }

  protected saveServer(url: string, token: string): void {
    const address = url.trim();
    if (!address) return;
    this.serverUrl.set(address);
    this.serverToken.set(token.trim());
    this.message.set('');
    try {
      localStorage.setItem(SERVER_STORE, address);
      localStorage.setItem(TOKEN_STORE, token.trim());
    } catch {
      /* storage blocked */
    }
  }

  protected msgKey(m: Exclude<YtMessage, ''>): TranslationKey {
    return MESSAGE_KEYS[m];
  }

  protected dismissTip(): void {
    this.showTip.set(false);
    try {
      localStorage.setItem(TIP_STORE, '1');
    } catch {
      /* storage blocked */
    }
  }

  protected createPlaylist(name: string): void {
    const n = name.trim();
    if (!n) return;
    const pl: YtPlaylist = { id: newId(), name: n, songs: [] };
    this.message.set('');
    this.playlists.update((l) => [...l, pl]);
    this.target.set(pl.id);
    this.openList.set(pl.id);
  }

  protected renamePlaylist(id: string, name: string): void {
    const n = name.trim();
    if (!n) return;
    this.playlists.update((l) => l.map((p) => (p.id === id ? { ...p, name: n } : p)));
  }

  protected deletePlaylist(id: string): void {
    this.playlists.update((l) => l.filter((p) => p.id !== id));
    if (this.target() === id) this.target.set(this.playlists()[0]?.id ?? '');
  }

  protected setTarget(ev: Event): void {
    this.target.set((ev.target as HTMLSelectElement).value);
  }

  protected addToPlaylist(v: YtVideo): void {
    const id = this.target();
    if (!this.playlists().some((p) => p.id === id)) {
      this.message.set('noplaylist');
      return;
    }
    this.message.set('');
    this.playlists.update((l) => l.map((p) => (p.id === id && !p.songs.some((s) => s.id === v.id) ? { ...p, songs: [...p.songs, v] } : p)));
  }

  protected saveQueue(name: string): void {
    const n = name.trim();
    if (!n || !this.queue().length) return;
    const pl: YtPlaylist = { id: newId(), name: n, songs: [...this.queue()] };
    this.playlists.update((l) => [...l, pl]);
    this.target.set(pl.id);
    this.openList.set(pl.id);
  }

  protected removeSong(id: string, songId: string): void {
    this.playlists.update((l) => l.map((p) => (p.id === id ? { ...p, songs: p.songs.filter((s) => s.id !== songId) } : p)));
  }

  protected moveSong(id: string, i: number, by: number): void {
    this.playlists.update((l) =>
      l.map((p) => {
        const j = i + by;
        if (p.id !== id || j < 0 || j >= p.songs.length) return p;
        const songs = [...p.songs];
        [songs[i], songs[j]] = [songs[j], songs[i]];
        return { ...p, songs };
      }),
    );
  }

  protected playPlaylist(p: YtPlaylist): void {
    this.playNow([...p.songs]);
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
      this.wantPlay = true;
      player.loadVideoById(id, this.startAt);
      this.startAt = 0;
      this.applyQuality();
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
    if (this.audioMode() || !this.player || !this.playerReady()) return;
    this.time.set(this.player.getCurrentTime() || 0);
    this.duration.set(this.player.getDuration() || 0);
  }

  private onState(state: number): void {
    if (this.audioMode()) return;
    const ms = 'mediaSession' in navigator ? navigator.mediaSession : null;
    if (state === YT_PLAYING) {
      this.playing.set(true);
      this.failed.set(false);
      this.applyQuality();
      this.qualities.set((this.player?.getAvailableQualityLevels() ?? []).filter((l) => l in QUALITY_LABELS));
      this.startKeepAlive();
      if (!this.serverOk && this.serverBase()) void this.ping();
      if (ms)
        ms.playbackState = 'playing';
      void this.requestWake();
    } else if (state === YT_PAUSED) {
      // The browser paused us while hidden, not the listener: carry on.
      if (this.wantPlay && document.visibilityState === 'hidden') {
        this.player?.playVideo();
        return;
      }
      this.playing.set(false);
      this.keepAlive?.pause();
      if (ms)
        ms.playbackState = 'paused';
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
