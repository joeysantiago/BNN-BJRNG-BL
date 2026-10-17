import { I18nService } from '../core/i18n.service';
import { isPlatformBrowser } from '@angular/common';
import { BARS, H, W, drawDance } from './dance-draw';
import { TranslationKey } from '../core/models/i18n.model';
import { AudioContextWindow, DanceChoice, DancePalette, DanceState, DanceVariant } from './dance-doodle.model';
import { Component, ElementRef, OnDestroy, PLATFORM_ID, afterNextRender, computed, effect, inject, input, signal, viewChild } from '@angular/core';

const STORAGE_KEY = 'thakurg-dance';
const VARIANTS: DanceVariant[] = ['stick', 'trio', 'robot', 'cat', 'blob', 'lines'];
const OPTIONS: DanceChoice[] = ['auto', ...VARIANTS];

const avg = (buf: Uint8Array, from: number, to: number): number => {
  let sum = 0;
  for (let i = from; i < to; i++) sum += buf[i];
  return sum / (to - from) / 255;
};

/**
 * A doodle that dances to the music, with bars that go up and down. It listens to the playing audio element through the
 * Web Audio analyser. If the browser does not allow that, it falls back to a steady beat so it still moves.
 */
@Component({
  selector: 'app-dance-doodle',
  templateUrl: './dance-doodle.html',
  styleUrl: './dance-doodle.scss',
})
export class DanceDoodle implements OnDestroy {
  private raf = 0;
  private last = 0;
  private skin = '';
  private avgBass = 0;
  private beatClock = 0;
  private failed = false;
  readonly seed = input(0);
  private ctx?: AudioContext;
  private analyser?: AnalyserNode;
  private buf = new Uint8Array(0);
  readonly playing = input(false);
  private bound?: HTMLAudioElement;
  protected readonly options = OPTIONS;
  protected readonly i18n = inject(I18nService);
  readonly audio = input<HTMLAudioElement | null>(null);
  protected readonly choice = signal<DanceChoice>('auto');
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('cv');
  private readonly reduce = this.browser && matchMedia('(prefers-reduced-motion: reduce)').matches;
  protected readonly variant = computed<DanceVariant>(() => (this.choice() === 'auto' ? VARIANTS[this.seed() % VARIANTS.length] : (this.choice() as DanceVariant)));
  private readonly state: DanceState = {
    t: 0,
    ph: 0,
    e: 0,
    beat: 0,
    bass: 0,
    mid: 0,
    high: 0,
    frame: 0,
    bars: new Array<number>(BARS).fill(0),
    pal: { ink: '#f5ecf7', a: '#e3bd68', b: '#f6dc98', muted: '#cfc1d6' },
  };
  private readonly tick = (now: number): void => {
    this.raf = 0;
    const s = this.state;
    this.update(Math.min(0.05, (now - this.last) / 1000 || 0.016));
    this.last = now;
    this.draw();
    if (this.playing() || s.e > 0.01 || s.beat > 0.01)
      this.raf = requestAnimationFrame(this.tick);
  };

  constructor() {
    afterNextRender(() => {
      const saved = this.stored();
      if (saved)
        this.choice.set(saved);
      this.draw();
    });

    effect(() => {
      if (!this.browser || !this.playing())
        return;
      this.connect();
      this.kick();
    });

    // A new look is drawn straight away, also while the music is paused.
    effect(() => {
      this.variant();
      if (this.browser)
        this.draw();
    });
  }

  // #region Public Methods

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
    void this.ctx?.close().catch(() => undefined);
  }

  // #endregion

  // #region Private Methods

  private kick(): void {
    if (this.raf)
      return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  private draw(): void {
    const cv = this.canvas()?.nativeElement;
    const w = cv?.clientWidth ?? 0;
    if (!cv || !w)
      return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const pw = Math.round(w * dpr);
    if (cv.width !== pw) {
      cv.width = pw;
      cv.height = Math.round((w * H * dpr) / W);
    }
    if ((document.documentElement.getAttribute('data-skin') ?? '') !== this.skin)
      this.readPalette(cv);
    const c = cv.getContext('2d');
    if (!c)
      return;
    c.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
    c.clearRect(0, 0, W, H);
    drawDance(c, this.variant(), this.state);
  }

  private connect(): void {
    const a = this.audio();
    if (!a || this.failed)
      return;
    try {
      const w = window as unknown as AudioContextWindow;
      const Ctx = w.AudioContext ?? w.webkitAudioContext;
      if (!Ctx)
        throw new Error('no Web Audio');
      this.ctx ??= new Ctx();
      if (!this.analyser) {
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.7;
        this.analyser.connect(this.ctx.destination);
        this.buf = new Uint8Array(this.analyser.frequencyBinCount);
      }
      if (this.bound !== a) {
        this.ctx.createMediaElementSource(a).connect(this.analyser);
        this.bound = a;
      }
      void this.ctx.resume();
    } catch {
      this.failed = true;
    }
  }

  private update(dt: number): void {
    const s = this.state;
    const live = this.playing();
    const real = live && !this.failed && this.analyser && this.ctx?.state === 'running';
    let level = 0;
    s.t += dt;
    s.frame = Math.floor(s.t * 8);

    if (real) {
      this.analyser!.getByteFrequencyData(this.buf);
      s.bass = avg(this.buf, 1, 6);
      s.mid = avg(this.buf, 6, 30);
      s.high = avg(this.buf, 30, 90);
      level = Math.min(1, s.bass * 0.5 + s.mid * 0.4 + s.high * 0.3);
      this.avgBass += (s.bass - this.avgBass) * 0.03;
      if (s.bass > this.avgBass * 1.25 + 0.06 && s.beat < 0.4)
        s.beat = 1;
    } else if (live) {
      // No analyser: keep a steady, friendly beat so the doodle still dances.
      level = 0.5 + 0.2 * Math.sin(s.t * 1.7);
      s.bass = level;
      s.mid = 0.4 + 0.25 * Math.sin(s.t * 3.1);
      s.high = 0.3 + 0.25 * Math.sin(s.t * 4.3);
      this.beatClock += dt * 1.85;
      if (this.beatClock >= 1) {
        this.beatClock -= 1;
        s.beat = 1;
      }
    }

    s.bars.forEach((v, i) => {
      let target = 0;
      if (real) {
        target = this.buf[Math.floor(1 + (i / BARS) ** 1.6 * 100)] / 255;
      } else if (live) {
        target = level * (0.35 + 0.65 * Math.abs(Math.sin(s.ph * 1.3 + i * 0.45)));
      }
      s.bars[i] = v + (target - v) * (target > v ? 0.5 : 0.15);
    });

    const scale = this.reduce ? 0.4 : 1;
    const eTarget = level * scale;
    s.e += (eTarget - s.e) * (eTarget > s.e ? 0.35 : 0.06);
    s.beat *= Math.pow(0.04, dt);
    s.ph += dt * (this.reduce ? 1 : 1.8 + 5.5 * s.e);
  }

  private stored(): DanceChoice | null {
    try {
      const v = localStorage.getItem(STORAGE_KEY) as DanceChoice | null;
      return v && OPTIONS.includes(v) ? v : null;
    } catch {
      return null;
    }
  }

  protected pick(o: DanceChoice): void {
    this.choice.set(o);
    try {
      localStorage.setItem(STORAGE_KEY, o);
    } catch {
      /* storage may be blocked */
    }
  }

  private readPalette(el: HTMLElement): void {
    const css = getComputedStyle(el);
    const pick = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    const pal: DancePalette = { ink: pick('--inset-text', '#f5ecf7'), a: pick('--gauge-a', '#e3bd68'), b: pick('--gauge-b', '#f6dc98'), muted: pick('--inset-muted', '#cfc1d6') };
    this.state.pal = pal;
    this.skin = document.documentElement.getAttribute('data-skin') ?? '';
  }

  protected label(o: DanceChoice): TranslationKey {
    return `dance.${o}` as TranslationKey;
  }

  // #endregion
}
