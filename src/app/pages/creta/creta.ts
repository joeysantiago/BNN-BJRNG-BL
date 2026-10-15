import { SITE_URL } from '../../core/site';
import { TranslationKey } from '../../i18n/en';
import { ActivatedRoute } from '@angular/router';
import { SeoService } from '../../core/seo.service';
import { isPlatformBrowser } from '@angular/common';
import { I18nService } from '../../core/i18n.service';
import { PlayerConfig, PlayerId, Repeat, Track } from './creta.model';
import { Component, ElementRef, OnDestroy, PLATFORM_ID, afterNextRender, computed, effect, inject, signal, viewChild } from '@angular/core';

const PLAYERS: Record<PlayerId, PlayerConfig> = {
  creta: {
    dir: '/audio/',
    repoDir: 'public/audio/',
    path: '/creta/',
    name: 'Creta',
    passwordHash: 'ceb73fa88041c2f58999c6c512c4538f754ad096f84745b3ccba26f7b91c96c2',
  },
  nexon: {
    dir: '/nexon-audio/',
    repoDir: 'public/nexon-audio/',
    path: '/nexon/',
    name: 'Nexon',
    passwordHash: '3bb4657f611b9c7982912764ece3bb7fff16388390ffa87c9371e0ece7e79844',
  },
};

const sha256 = async (text: string): Promise<string> => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
};
const BRANCH = 'main';
const DEFAULT_REPO = 'joeysantiago/BNN-BJRNG-BL';
const LS_TOKEN = 'creta.ghToken';
const LS_REPO = 'creta.ghRepo';
const AUDIO_EXT = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|weba)$/i;

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

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

const fmtTime = (s: number): string => {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

@Component({
  selector: 'app-creta',
  templateUrl: './creta.html',
  styleUrl: './creta.scss',
})
export class Creta implements OnDestroy {
  protected readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly audioRef = viewChild<ElementRef<HTMLAudioElement>>('audio');
  protected readonly id: PlayerId = inject(ActivatedRoute).snapshot.data['player'] === 'nexon' ? 'nexon' : 'creta';
  private readonly cfg = PLAYERS[this.id];
  protected readonly pendingDelete = signal<Track | null>(null);

  protected readonly tracks = signal<Track[]>([]);
  protected readonly loaded = signal(false);
  protected readonly index = signal(0);
  protected readonly playing = signal(false);
  protected readonly time = signal(0);
  protected readonly duration = signal(0);
  protected readonly volume = signal(0.8);
  protected readonly muted = signal(false);
  protected readonly shuffle = signal(false);
  protected readonly repeat = signal<Repeat>('off');
  protected readonly failed = signal(false);

  protected readonly current = computed(() => this.tracks()[this.index()] ?? null);
  protected readonly src = computed(() => {
    const t = this.current();
    return t ? this.cfg.dir + encodeURIComponent(t.file) : null;
  });
  protected readonly coverUrl = computed(() => {
    const c = this.current()?.cover;
    return c ? this.cfg.dir + encodeURIComponent(c) : null;
  });
  protected readonly timeText = computed(() => fmtTime(this.time()));
  protected readonly durationText = computed(() => fmtTime(this.duration()));

  // Playlist editing: commits to GitHub, whose push triggers the rebuild and redeploy.
  protected readonly token = signal('');
  protected readonly repo = signal(DEFAULT_REPO);
  protected readonly setupOpen = signal(false);
  protected readonly busy = signal(false);
  protected readonly status = signal<{ text: string; error: boolean } | null>(null);
  protected readonly canEdit = computed(() => !!this.token() && !!this.repo());

  protected autoplay = false;

  constructor() {
    effect(() => {
      this.seo.set({
        title: this.tt('seo.title'),
        description: this.tt('seo.desc'),
        path: this.cfg.path,
        image: this.id === 'creta' ? 'creta' : 'default',
        lang: this.i18n.lang(),
        imageAlt: `${this.cfg.name} audio player`,
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: this.tt('h1'),
            url: `${SITE_URL}${this.cfg.path}`,
            applicationCategory: 'MultimediaApplication',
            operatingSystem: 'Any',
            description: this.tt('seo.desc'),
            image: `${SITE_URL}/og/${this.id === 'creta' ? 'creta' : 'default'}.png`,
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
      this.token.set(lsGet(LS_TOKEN));
      this.repo.set(lsGet(LS_REPO) || DEFAULT_REPO);
      void this.loadPlaylist();
    });
  }

  // #region Public Methods

  ngOnDestroy(): void {
    this.audioRef()?.nativeElement.pause();
    if (this.browser && 'mediaSession' in navigator) navigator.mediaSession.metadata = null;
  }

  // #endregion

  // #region Private Methods

  protected prev(): void {
    const a = this.audioRef()?.nativeElement;
    const n = this.tracks().length;
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

  protected onError(): void {
    if (this.current()) this.failed.set(true);
  }

  protected cycleRepeat(): void {
    this.repeat.update((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'));
  }

  protected forgetToken(): void {
    this.token.set('');
    lsSet(LS_TOKEN, '');
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

  private fail(text: string): void {
    this.status.set({ text, error: true });
  }

  private setupMediaSession(): void {
    if (!this.browser || !('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    ms.setActionHandler('play', () => this.toggle());
    ms.setActionHandler('pause', () => this.toggle());
    ms.setActionHandler('previoustrack', () => this.prev());
    ms.setActionHandler('nexttrack', () => this.next());
    this.updateMediaMetadata();
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

  protected next(auto = false): void {
    const n = this.tracks().length;
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
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.title,
      artist: t.artist ?? '',
      album: this.cfg.name,
      artwork: this.coverUrl() ? [{ src: this.coverUrl()! }] : [{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
    });
  }

  protected askDelete(t: Track): void {
    this.status.set(null);
    if (this.canEdit()) this.pendingDelete.set(t);
    else this.setupOpen.set(true);
  }

  protected setVolume(ev: Event): void {
    this.volume.set(+(ev.target as HTMLInputElement).value);
    this.muted.set(false);
  }

  private async loadPlaylist(): Promise<void> {
    try {
      const res = await fetch(`${this.cfg.dir}playlist.json`, { cache: 'no-cache' });
      const data = res.ok ? await res.json() : [];
      const list: unknown[] = Array.isArray(data) ? data : (data?.tracks ?? []);
      this.tracks.set(
        list
          .filter((t): t is Track => !!t && typeof (t as Track).file === 'string')
          .map((t) => ({ ...t, title: t.title || t.file.replace(/\.[^.]+$/, '') })),
      );
    } catch {
      this.tracks.set([]);
    }
    this.loaded.set(true);
    this.setupMediaSession();
  }

  protected onEnded(a: HTMLAudioElement): void {
    if (this.repeat() === 'one') {
      a.currentTime = 0;
      void a.play();
    } else {
      this.next(true);
    }
  }

  // ----- audio element events -----
  protected onLoaded(a: HTMLAudioElement): void {
    this.duration.set(a.duration || 0);
    if (this.autoplay) {
      this.autoplay = false;
      void a.play().catch(() => undefined);
    }
  }

  protected async onPick(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length || this.busy()) return;
    const bad = files.find((f) => !AUDIO_EXT.test(f.name));
    if (bad) return this.fail(this.i18n.t('creta.edit.badType').replace('{name}', bad.name));
    this.busy.set(true);
    try {
      for (const f of files) {
        this.status.set({ text: this.i18n.t('creta.edit.uploading').replace('{name}', f.name), error: false });
        const path = this.cfg.repoDir + f.name;
        const sha = await this.sha(path);
        await this.gh(path, 'PUT', { message: `Add track: ${f.name}`, content: await toBase64(f), branch: BRANCH, ...(sha ? { sha } : {}) });
      }
      this.status.set({ text: this.i18n.t('creta.edit.uploaded'), error: false });
    } catch (e) {
      this.fail((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  protected openAdd(picker: HTMLInputElement): void {
    if (this.canEdit()) picker.click();
    else this.setupOpen.set(true);
  }

  protected saveSetup(token: string, repo: string): void {
    this.token.set(token.trim());
    this.repo.set(repo.trim() || DEFAULT_REPO);
    lsSet(LS_TOKEN, this.token());
    lsSet(LS_REPO, this.repo() === DEFAULT_REPO ? '' : this.repo());
    this.setupOpen.set(false);
    this.status.set(null);
  }

  private async sha(path: string): Promise<string | null> {
    const res = await this.call(path, 'GET');
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(await this.errorText(res));
    return ((await res.json()) as { sha: string }).sha;
  }

  private async errorText(res: Response): Promise<string> {
    const msg = ((await res.json().catch(() => ({}))) as { message?: string }).message;
    if (res.status === 401 || res.status === 403) this.setupOpen.set(true);
    return `GitHub ${res.status}${msg ? ': ' + msg : ''}`;
  }

  protected async remove(t: Track, password: string): Promise<void> {
    if (this.busy()) return;
    if ((await sha256(password)) !== this.cfg.passwordHash) return this.fail(this.i18n.t('creta.edit.wrongPassword'));
    this.pendingDelete.set(null);
    this.busy.set(true);
    try {
      for (const name of [t.file, t.cover].filter((n): n is string => !!n)) {
        const path = this.cfg.repoDir + name;
        const sha = await this.sha(path);
        if (sha) await this.gh(path, 'DELETE', { message: `Remove track: ${name}`, sha, branch: BRANCH });
      }
      const removed = this.tracks().findIndex((x) => x.file === t.file);
      this.tracks.update((l) => l.filter((x) => x.file !== t.file));
      if (removed < this.index()) this.index.update((i) => i - 1);
      else if (removed === this.index()) this.index.set(Math.min(removed, Math.max(0, this.tracks().length - 1)));
      this.status.set({ text: this.i18n.t('creta.edit.removed'), error: false });
    } catch (e) {
      this.fail((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  private call(path: string, method: string, body?: object): Promise<Response> {
    const encoded = path.split('/').map(encodeURIComponent).join('/');
    const url = `https://api.github.com/repos/${this.repo()}/contents/${encoded}` + (method === 'GET' ? `?ref=${BRANCH}` : '');
    return fetch(url, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${this.token()}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  protected tt(name: 'h1' | 'lead' | 'empty2' | 'seo.title' | 'seo.desc'): string {
    const key = name.startsWith('seo.') ? `seo.${this.id}.${name.slice(4)}` : `${this.id}.${name}`;
    return this.i18n.t(key as TranslationKey);
  }

  private async gh(path: string, method: 'PUT' | 'DELETE', body: object): Promise<void> {
    const res = await this.call(path, method, body);
    if (!res.ok) throw new Error(await this.errorText(res));
  }

  // #endregion
}
