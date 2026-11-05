import { AR } from '../i18n/ar';
import { HI } from '../i18n/hi';
import { DOCUMENT } from '@angular/common';
import { APP_SETTINGS } from '../appSettings';
import { LANGS, Lang, langInfo } from './site';
import { EN, TranslationKey, Translations } from '../i18n/en';
import { PageId, PageName } from './models/app-settings.model';
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
  /** Texts of lazily loaded areas (SnapKhata), added by extend() when their pages load. A signal, so templates update when they arrive. */
  private readonly extra = signal<Record<Lang, Record<string, string>>>({ en: {}, hi: {}, ar: {} });
  /** App names saved in the browser (My Tasks renames itself, as the PageNames rows of the API branches), set by SettingsService. They win over appSettings.ts. */
  private readonly names = signal<Partial<Record<PageId, Partial<PageName>>>>({});

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

  /** Name of a page in the current language: a saved name (renamed app) first, then appSettings.ts. */
  page(id: PageId): string {
    const saved = this.names()[id];
    return saved?.[this.lang()] || saved?.en || APP_SETTINGS.pageNames[id][this.lang()] || APP_SETTINGS.pageNames[id].en;
  }

  /** Adds the texts of an area that loads later (SnapKhata), so the main bundle does not carry them. */
  extend(texts: Record<Lang, Record<string, string>>): void {
    this.extra.update((all) => ({ en: { ...all.en, ...texts.en }, hi: { ...all.hi, ...texts.hi }, ar: { ...all.ar, ...texts.ar } }));
  }

  /** The saved app names (SettingsService passes them after it reads the saved settings). */
  rename(names: Partial<Record<PageId, Partial<PageName>>>): void {
    this.names.set(names);
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

  /**
   * Translate a key; an unknown key (an app code this build does not name) is shown as it is. Reads the language signal, so templates update when the language changes.
   * Besides the typed keys it takes the keys added by extend() (SnapKhata), whose screens also build keys at run time ('khata.f.' + kind), as in the API branches.
   */
  t(key: TranslationKey | (string & {}), params?: Record<string, string | number>): string {
    const lang = this.lang();
    const extra = this.extra();
    let text: string = (DICTS[lang] as Record<string, string>)[key] ?? extra[lang][key] ?? (EN as Record<string, string>)[key] ?? extra.en[key] ?? key;
    // "{page:khata}" in a text is that page's name (appSettings.ts pageNames), as in the API branches, so renaming an app renames it in every text.
    text = text.replace(/\{page:(\w+)\}/g, (match, id: string) => (id in APP_SETTINGS.pageNames ? this.page(id as PageId) : match));
    if (params)
      for (const [k, v] of Object.entries(params)) text = text.replaceAll(`{${k}}`, String(v));
    return text;
  }

  // #endregion
}
