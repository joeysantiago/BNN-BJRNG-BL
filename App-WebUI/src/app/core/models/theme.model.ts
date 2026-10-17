import { TranslationKey } from './i18n.model';

export type Skin = 'glass' | 'clay' | 'skeu' | 'neu';

export interface SkinInfo {
  id: Skin;
  /** Browser UI colour (theme-color meta) for this skin. */
  chrome: string;
  labelKey: TranslationKey;
}
