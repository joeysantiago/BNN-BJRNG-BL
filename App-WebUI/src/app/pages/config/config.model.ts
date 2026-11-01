import { FeatureGroup, FeatureInfo, SettingsSection } from '../../core/models/app-settings.model';

export interface ConfigGroup {
  id: FeatureGroup;
  help: string;
  label: string;
  items: FeatureInfo[];
}

/** The server's answer shown under a form (the YouTube key). */
export interface PanelNotice {
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

/** The answer shown under the user row of the Users and access panel that was saved. */
export interface UserNotice {
  id: number;
  text: string;
  error: boolean;
}
