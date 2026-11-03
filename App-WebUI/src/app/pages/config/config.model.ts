import { PageCode } from '../../core/models/role.model';
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

/** The answer shown under the row of a tab that was saved (a user, a role, a page right). */
export interface UserNotice {
  id: number;
  text: string;
  error: boolean;
}

/** A tab of the Settings page. */
export type SettingsTab = 'account' | 'users' | 'roles' | 'permissions' | 'features' | 'connection' | 'services' | 'youtube' | 'json' | 'mail';

/** A tab of the Settings page and the page code whose View right shows it. */
export interface TabInfo {
  id: SettingsTab;
  page: PageCode;
}
