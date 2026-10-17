import { FeatureGroup, FeatureInfo } from '../../core/models/app-settings.model';

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
