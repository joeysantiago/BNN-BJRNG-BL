import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Brightness, ModeInfo, Skin, SkinInfo, ThemeMode } from './models/theme.model';

export const SKINS: readonly SkinInfo[] = [
  { id: 'glass', labelKey: 'theme.glass', natural: 'dark', chrome: { dark: '#170a1c', light: '#f6eef8' } },
  { id: 'clay', labelKey: 'theme.clay', natural: 'light', chrome: { dark: '#1d1530', light: '#f1e3fb' } },
  { id: 'skeu', labelKey: 'theme.skeu', natural: 'light', chrome: { dark: '#2b2f35', light: '#c9ccd1' } },
  { id: 'neu', labelKey: 'theme.neu', natural: 'light', chrome: { dark: '#2a2f39', light: '#e0e5ec' } },
];

export const MODES: readonly ModeInfo[] = [
  { id: 'dark', labelKey: 'theme.dark' },
  { id: 'light', labelKey: 'theme.light' },
  { id: 'system', labelKey: 'theme.system' },
];

const MODE_KEY = 'thakurg-mode';

const STORAGE_KEY = 'thakurg-skin';

/**
 * The look of the site: a skin (Glass, Clay, Skeu, Neu) and its brightness (Dark, Light, or System = follow the device, live).
 * Both are kept in this browser only. Until a brightness is chosen each skin keeps its own (Glass dark, the others light).
 * index.html applies both before the first paint; this service keeps them in step afterwards.
 */
@Injectable({ providedIn: 'root' })

export class ThemeService {
  readonly modes = MODES;
  readonly skins = SKINS;
  readonly skin = signal<Skin>('glass');
  private readonly doc = inject(DOCUMENT);
  private readonly systemDark = signal(false);
  /** The chosen brightness; null = never chosen (the skin's own). */
  readonly mode = signal<ThemeMode | null>(null);
  /** The button that shows as chosen: the stored choice, or the skin's own brightness when there is none. */
  readonly activeMode = computed<ThemeMode>(() => this.mode() ?? this.brightness());
  /** The brightness on screen now. */
  readonly brightness = computed<Brightness>(() => {
    const m = this.mode();
    return m === 'system' ? (this.systemDark() ? 'dark' : 'light') : (m ?? SKINS.find((s) => s.id === this.skin())!.natural);
  });

  // #region Public Methods

  /** Read the saved skin and brightness and follow the device's setting. Call once in the browser. */
  restore(): void {
    const query = this.doc.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');
    if (query) {
      this.systemDark.set(query.matches);
      query.addEventListener('change', (e) => {
        this.systemDark.set(e.matches);
        this.apply();
      });
    }
    try {
      const v = localStorage.getItem(STORAGE_KEY) as Skin | null;
      if (v && SKINS.some((s) => s.id === v))
        this.skin.set(v);
      const m = localStorage.getItem(MODE_KEY) as ThemeMode | null;
      if (m && MODES.some((x) => x.id === m))
        this.mode.set(m);
    } catch {
      /* storage may be blocked */
    }
    this.apply();
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
    this.apply();
    this.store(MODE_KEY, mode);
  }

  set(skin: Skin, persist = true): void {
    this.skin.set(skin);
    this.apply();
    if (persist)
      this.store(STORAGE_KEY, skin);
  }

  // #endregion

  // #region Private Methods

  /** Puts the skin and brightness on <html> and colours the browser bar to match. */
  private apply(): void {
    const el = this.doc.documentElement;
    const brightness = this.brightness();
    el.setAttribute('data-skin', this.skin());
    el.setAttribute('data-mode', brightness);
    const chrome = SKINS.find((s) => s.id === this.skin())?.chrome[brightness];
    const meta = this.doc.querySelector('meta[name="theme-color"]');
    if (meta && chrome)
      meta.setAttribute('content', chrome);
  }

  private store(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  }

  // #endregion
}
