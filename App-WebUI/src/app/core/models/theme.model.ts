import { TranslationKey } from './i18n.model';

export type Skin = 'glass' | 'clay' | 'skeu' | 'neu';

/** Light or dark as shown on the page (data-mode on <html>). */
export type Brightness = 'dark' | 'light';

/** The visitor's choice: dark, light, or follow the device (system). */
export type ThemeMode = Brightness | 'system';

export interface SkinInfo {
  id: Skin;
  /** The brightness the skin has when the visitor never chose one (Glass dark, the others light), so nothing changes until they pick. */
  natural: Brightness;
  labelKey: TranslationKey;
  /** Browser UI colour (theme-color meta) for this skin, dark and light. */
  chrome: Record<Brightness, string>;
}

/** One of the Dark / Light / System buttons. */
export interface ModeInfo {
  id: ThemeMode;
  labelKey: TranslationKey;
}
