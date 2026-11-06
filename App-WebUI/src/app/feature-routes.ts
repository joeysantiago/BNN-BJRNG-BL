import { FeaturePanel } from './core/models/feature-panel.model';

/**
 * Mojito holds every app in one build, so its routes stay in app.routes.ts (with the lazily loaded Khata and Tasks texts); this file has only what the shared
 * Settings, Profile and header read, the same names as feature-routes.ts of the API branches.
 */

/** The apps this build holds (Mojito holds every app). The Settings page and the header show only their settings. */
export const FEATURE_APPS: string[] = ['speedtest', 'youtube', 'creta', 'nexon', 'hr', 'khata', 'tasks', 'tracker'];

/** The settings each app brings to Settings > General (its own section there), loaded lazily. */
export const FEATURE_SETTINGS: FeaturePanel[] = [{ app: 'khata', order: 1, load: () => import('./pages/khata/settings-panel/khata-settings-panel.mojito').then((m) => m.KhataSettingsPanelMojito) }, { app: 'tasks', order: 2, load: () => import('./pages/tasks/settings-panel/tasks-settings-panel.mojito').then((m) => m.TasksSettingsPanelMojito) }, { app: 'tracker', order: 3, load: () => import('./pages/tracker/settings-panel/tracker-settings-panel.mojito').then((m) => m.TrackerSettingsPanelMojito) }];

/** The parts each app brings to the Profile page (for example deleting the data a user keeps in that app), loaded lazily. */
export const FEATURE_PROFILE: FeaturePanel[] = [{ app: 'khata', order: 1, load: () => import('./pages/khata/profile-panel/khata-profile-panel.mojito').then((m) => m.KhataProfilePanelMojito) }, { app: 'tasks', order: 2, load: () => import('./pages/tasks/profile-panel/tasks-profile-panel.mojito').then((m) => m.TasksProfilePanelMojito) }, { app: 'tracker', order: 3, load: () => import('./pages/tracker/profile-panel/tracker-profile-panel.mojito').then((m) => m.TrackerProfilePanelMojito) }];
