import { Routes } from '@angular/router';
import { SitePages } from './core/models/site-pages.model';
import TRACKER_PAGES from './pages/tracker/tracker.pages.json';
import { TRACKER_ROUTES } from './pages/tracker/tracker.routes';
import { FeaturePanel } from './core/models/feature-panel.model';

/**
 * Every feature brings its own routes file and *.pages.json (prerender list and sitemap entries) inside its folder.
 * Each feature branch adds its own import and entry in both lists below (shared lists none, main lists all). The speed test stays first: it is the home page.
 * scripts/postbuild.mjs finds the *.pages.json files by itself.
 */
export const FEATURE_ROUTES: Routes = [{ path: '', pathMatch: 'full', redirectTo: 'tracker/app' }, ...TRACKER_ROUTES];

export const FEATURE_PAGES: SitePages[] = [TRACKER_PAGES];

/** The apps this branch holds (app codes of core/apps.ts, plus 'speedtest'). The Settings page shows only their settings and access boxes. */
export const FEATURE_APPS: string[] = ['tracker'];

/** The settings each app brings to Settings > General (its own section there), loaded lazily. Each feature branch lists its own; shared lists none. */
export const FEATURE_SETTINGS: FeaturePanel[] = [{ app: 'tracker', order: 1, load: () => import('./pages/tracker/settings-panel/tracker-settings-panel').then((m) => m.TrackerSettingsPanel) }];

/** The parts each app brings to the Profile page (for example deleting the data a user keeps in that app), loaded lazily. Each feature branch lists its own; shared lists none. */
export const FEATURE_PROFILE: FeaturePanel[] = [{ app: 'tracker', order: 1, load: () => import('./pages/tracker/profile-panel/tracker-profile-panel').then((m) => m.TrackerProfilePanel) }];
