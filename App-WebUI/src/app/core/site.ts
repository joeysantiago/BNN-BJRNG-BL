export const SITE_URL = 'https://thakurg.com';
export const SITE_NAME = 'thakurg.com';

export type Lang = 'en' | 'hi' | 'ar';

export interface LangInfo {
  code: Lang;
  /** URL path of the speed test (the home page) in this language. */
  home: string;
  locale: string;
  native: string;
  dir: 'ltr' | 'rtl';
}

export const LANGS: readonly LangInfo[] = [
  { code: 'en', native: 'English', dir: 'ltr', locale: 'en_US', home: '/' },
  { code: 'hi', native: 'हिन्दी', dir: 'ltr', locale: 'hi_IN', home: '/hi/' },
  { code: 'ar', native: 'العربية', dir: 'rtl', locale: 'ar_AE', home: '/ar/' },
];

export const langInfo = (code: Lang): LangInfo => LANGS.find((l) => l.code === code) ?? LANGS[0];
