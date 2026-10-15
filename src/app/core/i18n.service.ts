import { AR } from '../i18n/ar';
import { HI } from '../i18n/hi';
import { DOCUMENT } from '@angular/common';
import { LANGS, Lang, langInfo } from './site';
import { EN, TranslationKey, Translations } from '../i18n/en';
import { Injectable, computed, inject, signal } from '@angular/core';

const STORAGE_KEY = 'thakurg-lang';
const DICTS: Record<Lang, Translations> = { en: EN, hi: HI, ar: AR };

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly doc = inject(DOCUMENT);

  readonly languages = LANGS;
  readonly lang = signal<Lang>('en');
  readonly info = computed(() => langInfo(this.lang()));
  readonly dir = computed(() => this.info().dir);

  /** Translate a key. Reads the language signal, so templates update when the language changes. */
  t(key: TranslationKey, params?: Record<string, string | number>): string {
    let text = DICTS[this.lang()][key] ?? EN[key];
    if (params) {
      for (const [k, v] of Object.entries(params)) text = text.replaceAll(`{${k}}`, String(v));
    }
    return text;
  }

  /** Switch language. `persist` stores the choice so it is remembered on the next visit. */
  set(lang: Lang, persist = true): void {
    this.lang.set(lang);
    const info = langInfo(lang);
    const el = this.doc.documentElement;
    el.setAttribute('lang', info.code);
    el.setAttribute('dir', info.dir);
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch {
        /* storage may be blocked */
      }
    }
  }

  /** The language the visitor chose last time, if any. Browser only. */
  stored(): Lang | null {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v === 'en' || v === 'hi' || v === 'ar' ? v : null;
    } catch {
      return null;
    }
  }
}
