import { ApiService } from './api.service';
import { DOCUMENT } from '@angular/common';
import { LANGS, Lang, langInfo } from './site';
import { PageId } from './models/app-settings.model';
import { SettingsService } from './settings.service';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Dictionaries, Dictionary, TranslationKey } from './models/i18n.model';

const STORAGE_KEY = 'thakurg-lang';
const LOAD_TIMEOUT = 5000;

@Injectable({ providedIn: 'root' })

export class I18nService {
  readonly languages = LANGS;
  readonly lang = signal<Lang>('en');
  private readonly doc = inject(DOCUMENT);
  private readonly api = inject(ApiService);
  private readonly cfg = inject(SettingsService);
  readonly dir = computed(() => this.info().dir);
  readonly info = computed(() => langInfo(this.lang()));
  private readonly dicts = signal<Dictionaries>({ en: {}, hi: {}, ar: {} });

  // #region Public Methods

  /** The language the visitor chose last time, if any. Browser only. */
  stored(): Lang | null {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v === 'en' || v === 'hi' || v === 'ar' ? v : null;
    } catch {
      return null;
    }
  }

  /** Name of a page in the current language, from the settings master table. Falls back to English, then to the page id. */
  page(id: PageId): string {
    const name = this.cfg.settings().pageNames[id];
    return name?.[this.lang()] ?? name?.en ?? id;
  }

  /** Switch language. `persist` stores the choice so it is remembered on the next visit. */
  set(lang: Lang, persist = true): void {
    this.lang.set(lang);
    const info = langInfo(lang);
    const el = this.doc.documentElement;
    el.setAttribute('lang', info.code);
    el.setAttribute('dir', info.dir);
    if (persist)
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch {
        /* storage may be blocked */
      }
  }

  /** Fetch the texts of every language from the API (Translations master table). Never throws: a text that is missing shows its key. */
  async load(): Promise<void> {
    const loaded = await Promise.all(LANGS.map((l) => this.fetch(l.code)));
    this.dicts.set({ en: loaded[0], hi: loaded[1], ar: loaded[2] });
  }

  /** Translate a key. Reads the language signal, so templates update when the language changes. */
  t(key: TranslationKey, params?: Record<string, string | number>): string {
    const d = this.dicts();
    let text = d[this.lang()][key] ?? d.en[key] ?? key;
    if (params)
      for (const [k, v] of Object.entries(params)) text = text.replaceAll(`{${k}}`, String(v));
    return text;
  }

  // #endregion

  // #region Private Methods

  private async fetch(lang: Lang): Promise<Dictionary> {
    try {
      return await this.api.get<Dictionary>(`/translations/${lang}`, LOAD_TIMEOUT);
    } catch (e) {
      console.warn(`Texts for "${lang}" could not be loaded from the API; keys will be shown instead.`, e);
      return {};
    }
  }

  // #endregion
}
