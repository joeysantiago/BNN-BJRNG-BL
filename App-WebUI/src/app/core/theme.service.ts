import { DOCUMENT } from '@angular/common';
import { Skin, SkinInfo } from './models/theme.model';
import { Injectable, inject, signal } from '@angular/core';

export const SKINS: readonly SkinInfo[] = [
  { id: 'glass', labelKey: 'theme.glass', chrome: '#170a1c' },
  { id: 'clay', labelKey: 'theme.clay', chrome: '#f1e3fb' },
  { id: 'skeu', labelKey: 'theme.skeu', chrome: '#c9ccd1' },
  { id: 'neu', labelKey: 'theme.neu', chrome: '#e0e5ec' },
];

const STORAGE_KEY = 'thakurg-skin';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly skins = SKINS;
  readonly skin = signal<Skin>('glass');
  private readonly doc = inject(DOCUMENT);

  // #region Public Methods

  /** Read the saved skin. Call once in the browser. */
  restore(): void {
    try {
      const v = localStorage.getItem(STORAGE_KEY) as Skin | null;
      if (v && SKINS.some((s) => s.id === v))
        this.set(v, false);
    } catch {
      /* storage may be blocked */
    }
  }

  set(skin: Skin, persist = true): void {
    this.skin.set(skin);
    this.doc.documentElement.setAttribute('data-skin', skin);
    const chrome = SKINS.find((s) => s.id === skin)?.chrome;
    const meta = this.doc.querySelector('meta[name="theme-color"]');
    if (meta && chrome)
      meta.setAttribute('content', chrome);
    if (persist)
      try {
        localStorage.setItem(STORAGE_KEY, skin);
      } catch {
        /* ignore */
      }
  }

  // #endregion
}
