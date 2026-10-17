import { SITE_URL } from '../../core/site';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { SeoService } from '../../core/seo.service';
import { isPlatformBrowser } from '@angular/common';
import { I18nService } from '../../core/i18n.service';
import { DanceDoodle } from '../../shared/dance-doodle';
import { TranslationKey } from '../../core/models/i18n.model';
import { SettingsService } from '../../core/settings.service';
import { PlayerId, Repeat, Track, TracksResponse } from './creta.model';
import { Component, ElementRef, OnDestroy, PLATFORM_ID, afterNextRender, computed, effect, inject, signal, viewChild } from '@angular/core';

const PATHS: Record<PlayerId, string> = { creta: '/creta/', nexon: '/nexon/' };
const PASSWORD_HEADER = 'X-Edit-Password';

const fmtTime = (s: number): string => {
  if (!Number.isFinite(s) || s < 0)
    return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

@Component({
  selector: 'app-creta',
  imports: [DanceDoodle],
  templateUrl: './creta.html',
  styleUrl: './creta.scss',
})

export class Creta implements OnDestroy {
  protected readonly id: PlayerId = inject(ActivatedRoute).snapshot.data['player'] === 'nexon' ? 'nexon' : 'creta';
  protected autoplay = false;
  protected readonly time = signal(0);
  protected readonly index = signal(0);
  private readonly path = PATHS[this.id];

  // Deleting a song goes through the music API and needs the edit password, which the server checks. Adding songs lives on the creta-add and nexon-add pages.
  protected readonly busy = signal(false);
  protected readonly duration = signal(0);
  protected readonly volume = signal(0.8);
  protected readonly muted = signal(false);
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);
  protected readonly failed = signal(false);
  protected readonly loaded = signal(false);
  protected readonly playing = signal(false);
  protected readonly shuffle = signal(false);
  protected readonly i18n = inject(I18nService);
  protected readonly tracks = signal<Track[]>([]);
  protected readonly repeat = signal<Repeat>('off');
  protected readonly flags = inject(SettingsService);
  protected readonly pendingDelete = signal<Track | null>(null);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly timeText = computed(() => fmtTime(this.time()));
  protected readonly src = computed(() => this.current()?.audioUrl ?? null);
  protected readonly durationText = computed(() => fmtTime(this.duration()));
  protected readonly audioRef = viewChild<ElementRef<HTMLAudioElement>>('audio');
  protected readonly coverUrl = computed(() => this.current()?.coverUrl ?? null);
  protected readonly current = computed(() => this.tracks()[this.index()] ?? null);
  protected readonly status = signal<{ text: string; error: boolean } | null>(null);

  constructor() {
    effect(() => {
      this.seo.set({
        title: this.tt('seo.title'),
        description: this.tt('seo.desc'),
        path: this.path,
        image: this.id === 'creta' ? 'creta' : 'default',
        lang: this.i18n.lang(),
        imageAlt: this.i18n.page(this.id),
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: this.tt('h1'),
            url: `${SITE_URL}${this.path}`,
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
      if (!a)
        return;
      a.volume = this.volume();
      a.muted = this.muted();
    });

    afterNextRender(() => void this.loadTracks());
  }

  // #region Public Methods

  ngOnDestroy(): void {
    this.audioRef()?.nativeElement.pause();
    if (this.browser && 'mediaSession' in navigator)
      navigator.mediaSession.metadata = null;
  }

  // #endregion

  // #region Private Methods

  protected prev(): void {
    const a = this.audioRef()?.nativeElement;
    const n = this.tracks().length;
    if (!n)
      return;
    if (a && a.currentTime > 3) {
      a.currentTime = 0;
      return;
    }
    this.autoplay = true;
    this.index.set((this.index() - 1 + n) % n);
  }

  protected toggle(): void {
    const a = this.audioRef()?.nativeElement;
    if (!a || !this.current())
      return;
    if (a.paused) {
      void a.play().catch(() => this.failed.set(true));
    } else {
      a.pause();
    }
  }

  protected onError(): void {
    if (this.current())
      this.failed.set(true);
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
    if (a)
      a.currentTime = +(ev.target as HTMLInputElement).value;
  }

  private fail(text: string): void {
    this.status.set({ text, error: true });
  }

  private abs(url: string): string {
    return /^https?:/i.test(url) ? url : this.api.url(url);
  }

  private setupMediaSession(): void {
    if (!this.browser || !('mediaSession' in navigator))
      return;
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
    if (!n)
      return;
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
    if (!this.browser || !('mediaSession' in navigator) || !t)
      return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.title,
      artist: t.artist ?? '',
      album: this.i18n.page(this.id),
      artwork: this.coverUrl() ? [{ src: this.coverUrl()! }] : [{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
    });
  }

  protected askDelete(t: Track): void {
    this.status.set(null);
    this.pendingDelete.set(t);
  }

  protected setVolume(ev: Event): void {
    this.volume.set(+(ev.target as HTMLInputElement).value);
    this.muted.set(false);
  }

  private errorText(e: unknown): string {
    const status = (e as { status?: number }).status;
    if (!status || status === 413)
      return this.i18n.t('creta.edit.failed');
    return status === 401 ? this.i18n.t('creta.edit.wrongPassword') : (e as Error).message;
  }

  private setTracks(list: Track[]): void {
    this.tracks.set(list.map((t) => ({ ...t, audioUrl: this.abs(t.audioUrl), coverUrl: t.coverUrl ? this.abs(t.coverUrl) : null })));
    if (this.index() >= list.length)
      this.index.set(Math.max(0, list.length - 1));
  }

  private async loadTracks(): Promise<void> {
    try {
      this.setTracks((await this.api.get<TracksResponse>(`/music/${this.id}/tracks`)).tracks);
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

  protected async remove(t: Track, password: string): Promise<void> {
    if (this.busy())
      return;
    this.busy.set(true);
    try {
      await this.api.send<null>('DELETE', `/music/${this.id}/tracks/${t.id}`, { headers: { [PASSWORD_HEADER]: password } });
      this.pendingDelete.set(null);
      const removed = this.tracks().findIndex((x) => x.id === t.id);
      this.tracks.update((l) => l.filter((x) => x.id !== t.id));
      if (removed < this.index()) {
        this.index.update((i) => i - 1);
      } else if (removed === this.index()) {
        this.index.set(Math.min(removed, Math.max(0, this.tracks().length - 1)));
      }
      this.status.set({ text: this.i18n.t('creta.edit.removed'), error: false });
    } catch (e) {
      this.fail(this.errorText(e));
    } finally {
      this.busy.set(false);
    }
  }

  protected tt(name: 'h1' | 'lead' | 'empty2' | 'seo.title' | 'seo.desc'): string {
    const key = name.startsWith('seo.') ? `seo.${this.id}.${name.slice(4)}` : `${this.id}.${name}`;
    return this.i18n.t(key as TranslationKey);
  }

  // #endregion
}
