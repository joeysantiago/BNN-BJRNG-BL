import { ApiService } from './api.service';
import { StaticTexts } from './static-texts';
import { LANGS, Lang, langInfo } from './site';
import { PageId } from './models/app-settings.model';
import { SettingsService } from './settings.service';
import { environment } from '../../environments/environment';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Dictionaries, Dictionary, TranslationKey } from './models/i18n.model';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';

const STORAGE_KEY = 'thakurg-lang';
const TEXTS_KEY = 'thakurg-texts-';
const WAKE_TIMEOUT = environment.timings.apiWakeMs;

@Injectable({ providedIn: 'root' })

export class I18nService {
  readonly languages = LANGS;
  readonly lang = signal<Lang>('en');
  private readonly doc = inject(DOCUMENT);
  private readonly api = inject(ApiService);
  private readonly files = inject(StaticTexts);
  private readonly cfg = inject(SettingsService);
  readonly dir = computed(() => this.info().dir);
  readonly info = computed(() => langInfo(this.lang()));
  /** The built-in texts of each language, loaded once (or being loaded). */
  private readonly builtIn = new Map<Lang, Promise<void>>();
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
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

  /**
   * Puts the texts in place without waiting for the API, so a page never shows empty while a sleeping API and database wake (about a minute):
   * the texts built into the site (StaticTexts, made from the seed scripts at build time) for English and the visitor's language, with the last texts this
   * browser got from the API on top. The API's texts (Translations master table) are then fetched in the background with a long wait and replace them
   * as soon as they arrive. The prerender uses the built-in texts of every language only. Never throws.
   */
  async load(): Promise<void> {
    if (!this.browser) {
      await Promise.all(LANGS.map((l) => this.ensure(l.code)));
      return;
    }
    await Promise.all([...new Set<Lang>(['en', this.wanted()])].map((l) => this.ensure(l)));
    for (const l of LANGS)
      void this.refresh(l.code);
  }

  /** Switch language. `persist` stores the choice so it is remembered on the next visit. */
  set(lang: Lang, persist = true): void {
    void this.ensure(lang);
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

  /** Translate a key. Reads the language signal, so templates update when the language changes. */
  t(key: TranslationKey, params?: Record<string, string | number>): string {
    const d = this.dicts();
    // "{page:khata}" in a text is that page's name from the PageNames table, so renaming an app there renames it in every text.
    let text = (d[this.lang()][key] ?? d.en[key] ?? key).replace(/\{page:(\w+)\}/g, (_, id: PageId) => this.page(id));
    if (params)
      for (const [k, v] of Object.entries(params)) text = text.replaceAll(`{${k}}`, String(v));
    return text;
  }

  // #endregion

  // #region Private Methods

  /** The language the page opens in: /hi or /ar in the address, else the visitor's saved choice, else English. Browser only. */
  private wanted(): Lang {
    const route = location.hash.startsWith('#/') ? location.hash.slice(1) : location.pathname;
    return (/^\/(hi|ar)(\/|$)/.exec(route)?.[1] as Lang | undefined) ?? this.stored() ?? 'en';
  }

  /** The texts of a language saved by the last successful API load in this browser, or none. */
  private saved(lang: Lang): Dictionary {
    if (!this.browser)
      return {};
    try {
      return JSON.parse(localStorage.getItem(TEXTS_KEY + lang) ?? '{}') as Dictionary;
    } catch {
      return {};
    }
  }

  /** Loads the built-in texts of a language once. Texts that already came from the API stay on top. */
  private ensure(lang: Lang): Promise<void> {
    let loading = this.builtIn.get(lang);
    if (!loading) {
      loading = this.files.get<Dictionary>(`${lang}.json`).then((dict) => this.dicts.update((d) => ({ ...d, [lang]: { ...dict, ...this.saved(lang), ...d[lang] } })));
      this.builtIn.set(lang, loading);
    }
    return loading;
  }

  /** The texts of a language from the API, with the long wait; the page updates as soon as they arrive and this browser keeps a copy. */
  private async refresh(lang: Lang): Promise<void> {
    try {
      const dict = await this.api.get<Dictionary>(`/translations/${lang}`, WAKE_TIMEOUT);
      this.dicts.update((d) => ({ ...d, [lang]: { ...d[lang], ...dict } }));
      localStorage.setItem(TEXTS_KEY + lang, JSON.stringify(dict));
    } catch (e) {
      console.warn(`Texts for "${lang}" could not be loaded from the API; the built-in texts stay in use.`, e);
    }
  }

  // #endregion
}
