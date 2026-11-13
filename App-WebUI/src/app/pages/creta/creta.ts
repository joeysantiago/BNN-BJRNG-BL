import { SITE_URL } from '../../core/site';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { SeoService } from '../../core/seo.service';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n.service';
import { DanceDoodle } from '../../shared/dance-doodle';
import { Repeat } from '../../shared/models/player.model';
import { AppPwaService } from '../../core/app-pwa.service';
import { TranslationKey } from '../../core/models/i18n.model';
import { SettingsService } from '../../core/settings.service';
import { environment } from '../../../environments/environment';
import { PlayerId, Track, TracksResponse } from './creta.model';
import { Component, ElementRef, OnDestroy, PLATFORM_ID, afterNextRender, computed, effect, inject, signal, viewChild } from '@angular/core';

const PATHS: Record<PlayerId, string> = { creta: '/creta/', nexon: '/nexon/' };

/** The track list may wait for a sleeping database to wake up (Azure SQL free offer). */
const LOAD_TIMEOUT_MS = environment.timings.musicLoadMs;

/** A failed song is resumed at most once per gap, so a file that really is broken does not loop. */
const RESUME_GAP_MS = environment.timings.musicResumeGapMs;

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
  private lastResume = 0;
  protected autoplay = false;
  protected readonly time = signal(0);
  protected readonly index = signal(0);
  private readonly path = PATHS[this.id];
  private resumeAt: number | null = null;

  // Deleting a song goes through the music API, which checks the login. Adding songs lives on the creta-add and nexon-add pages.
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
  private readonly auth = inject(AuthService);
  private readonly pwa = inject(AppPwaService);
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
    // Creta and Nexon each install as their own app.
    this.pwa.enter(this.id);
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

    // The login stays fresh while music plays, even when the phone is locked.
    effect(() => this.auth.keepAwake(this.playing()));

    afterNextRender(() => void this.loadTracks());
  }

  // #region Public Methods

  ngOnDestroy(): void {
    this.pwa.leave();
    this.audioRef()?.nativeElement.pause();
    this.auth.keepAwake(false);
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
    return (e as Error).message;
  }

  private setTracks(list: Track[]): void {
    this.tracks.set(list.map((t) => ({ ...t, audioUrl: this.abs(t.audioUrl), coverUrl: t.coverUrl ? this.abs(t.coverUrl) : null })));
    if (this.index() >= list.length)
      this.index.set(Math.max(0, list.length - 1));
  }

  private async loadTracks(): Promise<void> {
    try {
      this.setTracks((await this.api.get<TracksResponse>(`/music/${this.id}/tracks`, LOAD_TIMEOUT_MS)).tracks);
    } catch {
      this.tracks.set([]);
    }
    this.loaded.set(true);
    this.setupMediaSession();
  }

  /** A packet failed: the login ran out or the server was busy waking up. The song is resumed once before it counts as failed. */
  protected onError(a: HTMLAudioElement): void {
    if (!this.current())
      return;
    if (a.error?.code !== MediaError.MEDIA_ERR_ABORTED && Date.now() - this.lastResume > RESUME_GAP_MS) {
      void this.resume(a);
      return;
    }
    this.failed.set(true);
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
    if (this.resumeAt !== null) {
      a.currentTime = this.resumeAt;
      this.resumeAt = null;
    }
    if (this.autoplay) {
      this.autoplay = false;
      void a.play().catch(() => undefined);
    }
  }

  /** Makes the list match the player's folder in storage (new song files added, rows of missing files removed) and shows the API's message. */
  protected async sync(): Promise<void> {
    if (this.busy())
      return;
    this.busy.set(true);
    this.pendingDelete.set(null);
    try {
      const playingId = this.current()?.id;
      const res = await this.api.sendFull<TracksResponse>('POST', `/music/${this.id}/tracks/sync`);
      this.setTracks(res.data.tracks);
      // The song that is open stays open when it is still in the list.
      const at = this.tracks().findIndex((x) => x.id === playingId);
      if (at >= 0)
        this.index.set(at);
      this.status.set({ text: res.message ?? '', error: false });
    } catch (e) {
      this.fail(this.errorText(e));
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(t: Track): Promise<void> {
    if (this.busy())
      return;
    this.busy.set(true);
    try {
      await this.api.send<null>('DELETE', `/music/${this.id}/tracks/${t.id}`);
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

  /** Renews the login, then loads the same song again and carries on from the second where it stopped. */
  private async resume(a: HTMLAudioElement): Promise<void> {
    this.lastResume = Date.now();
    const at = a.currentTime;
    const wasPlaying = this.autoplay || this.playing();
    if (!(await this.auth.renewSession())) {
      this.failed.set(true);
      return;
    }
    this.resumeAt = at;
    this.autoplay = wasPlaying;
    a.load();
  }

  protected tt(name: 'h1' | 'lead' | 'empty2' | 'seo.title' | 'seo.desc'): string {
    const key = name.startsWith('seo.') ? `seo.${this.id}.${name.slice(4)}` : `${this.id}.${name}`;
    return this.i18n.t(key as TranslationKey);
  }

  // #endregion
}
