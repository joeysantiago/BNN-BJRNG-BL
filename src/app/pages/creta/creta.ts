import { isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, OnDestroy, PLATFORM_ID, afterNextRender, computed, effect, inject, signal, viewChild } from '@angular/core';
import { I18nService } from '../../core/i18n.service';
import { SeoService } from '../../core/seo.service';
import { SITE_URL } from '../../core/site';

export interface Track {
  title: string;
  artist?: string;
  /** File name inside the audio folder, for example "song.mp3". */
  file: string;
  /** Optional cover image, also inside the audio folder. */
  cover?: string;
}

type Repeat = 'off' | 'all' | 'one';

const AUDIO_DIR = '/audio/';

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
    return t ? AUDIO_DIR + encodeURIComponent(t.file) : null;
  });
  protected readonly coverUrl = computed(() => {
    const c = this.current()?.cover;
    return c ? AUDIO_DIR + encodeURIComponent(c) : null;
  });
  protected readonly timeText = computed(() => fmtTime(this.time()));
  protected readonly durationText = computed(() => fmtTime(this.duration()));

  protected autoplay = false;

  constructor() {
    effect(() => {
      this.seo.set({
        title: this.i18n.t('seo.creta.title'),
        description: this.i18n.t('seo.creta.desc'),
        path: '/creta/',
        image: 'creta',
        lang: this.i18n.lang(),
        imageAlt: 'Creta audio player',
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: this.i18n.t('creta.h1'),
            url: `${SITE_URL}/creta/`,
            applicationCategory: 'MultimediaApplication',
            operatingSystem: 'Any',
            description: this.i18n.t('seo.creta.desc'),
            image: `${SITE_URL}/og/creta.png`,
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

    afterNextRender(() => void this.loadPlaylist());
  }

  ngOnDestroy(): void {
    this.audioRef()?.nativeElement.pause();
    if (this.browser && 'mediaSession' in navigator) navigator.mediaSession.metadata = null;
  }

  private async loadPlaylist(): Promise<void> {
    try {
      const res = await fetch(`${AUDIO_DIR}playlist.json`, { cache: 'no-cache' });
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

  protected toggle(): void {
    const a = this.audioRef()?.nativeElement;
    if (!a || !this.current()) return;
    if (a.paused) void a.play().catch(() => this.failed.set(true));
    else a.pause();
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

  protected cycleRepeat(): void {
    this.repeat.update((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'));
  }

  protected seek(ev: Event): void {
    const a = this.audioRef()?.nativeElement;
    if (a) a.currentTime = +(ev.target as HTMLInputElement).value;
  }

  protected setVolume(ev: Event): void {
    this.volume.set(+(ev.target as HTMLInputElement).value);
    this.muted.set(false);
  }

  // ----- audio element events -----
  protected onLoaded(a: HTMLAudioElement): void {
    this.duration.set(a.duration || 0);
    if (this.autoplay) {
      this.autoplay = false;
      void a.play().catch(() => undefined);
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

  protected onError(): void {
    if (this.current()) this.failed.set(true);
  }

  protected onTrackChange(): void {
    this.time.set(0);
    this.duration.set(0);
    this.updateMediaMetadata();
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

  private updateMediaMetadata(): void {
    const t = this.current();
    if (!this.browser || !('mediaSession' in navigator) || !t) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.title,
      artist: t.artist ?? '',
      album: 'Creta',
      artwork: this.coverUrl() ? [{ src: this.coverUrl()! }] : [{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
    });
  }
}
