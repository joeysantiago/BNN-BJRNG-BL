import { TranslationKey } from '../../i18n/en';

export type Skin = 'glass' | 'clay' | 'skeu' | 'neu';

export interface SkinInfo {
  id: Skin;
  labelKey: TranslationKey;
  /** Browser UI colour (theme-color meta) for this skin. */
  chrome: string;
}
