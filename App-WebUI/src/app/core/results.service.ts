import { isPlatformBrowser } from '@angular/common';
import { SpeedResult } from './models/results.model';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

const KEY = 'thakurg-results';
const MAX = 30;

/** Saved speed test results. Stored in localStorage only, nothing leaves the browser. */
@Injectable({ providedIn: 'root' })
export class ResultsService {
  readonly items = signal<SpeedResult[]>([]);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    if (this.browser)
      this.items.set(this.read());
  }

  // #region Public Methods

  clear(): void {
    this.items.set([]);
    this.write();
  }

  remove(id: string): void {
    this.items.update((list) => list.filter((x) => x.id !== id));
    this.write();
  }

  save(r: Omit<SpeedResult, 'id'>): SpeedResult {
    const item: SpeedResult = { ...r, id: `${r.at}-${Math.random().toString(36).slice(2, 7)}` };
    this.items.update((list) => [item, ...list].slice(0, MAX));
    this.write();
    return item;
  }

  // #endregion

  // #region Private Methods

  private write(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.items()));
    } catch {
      /* storage full or blocked */
    }
  }

  private read(): SpeedResult[] {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
      return Array.isArray(raw) ? raw.filter((x) => x && typeof x.down === 'number') : [];
    } catch {
      return [];
    }
  }

  // #endregion
}
