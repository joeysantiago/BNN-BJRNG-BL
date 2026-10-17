import { FeatureGroup, FeatureInfo, SettingsSection } from '../../core/models/app-settings.model';

export interface ConfigGroup {
  id: FeatureGroup;
  help: string;
  label: string;
  items: FeatureInfo[];
}

/** Music players whose edit password can be changed. Same codes as the API's /music/{player}. */
export type PasswordPlayer = 'creta' | 'nexon';

export type PasswordKind = 'change' | 'reset';

export interface PasswordNotice {
  text: string;
  error: boolean;
}

/** What a Save button saves: one section of the page, or every unsaved edit. */
export type SaveTarget = SettingsSection | 'all';

/** The answer shown next to the Save button that was pressed. */
export interface SaveNotice {
  text: string;
  error: boolean;
  section: SaveTarget;
}
