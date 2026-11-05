import { Routes } from '@angular/router';
import MUSIC_PAGES from './pages/creta/music.pages.json';
import { MUSIC_ROUTES } from './pages/creta/music.routes';
import { SitePages } from './core/models/site-pages.model';
import { FeaturePanel } from './core/models/feature-panel.model';

/**
 * Every feature brings its own routes file and *.pages.json (prerender list and sitemap entries) inside its folder.
 * Each feature branch adds its own import and entry in both lists below (shared lists none, main lists all). The speed test stays first: it is the home page.
 * scripts/postbuild.mjs finds the *.pages.json files by itself.
 */
export const FEATURE_ROUTES: Routes = [{ path: '', pathMatch: 'full', redirectTo: 'creta' }, ...MUSIC_ROUTES];

export const FEATURE_PAGES: SitePages[] = [MUSIC_PAGES];

/** The apps this branch holds (app codes of core/apps.ts, plus 'speedtest'). The Settings page shows only their settings and access boxes. */
export const FEATURE_APPS: string[] = ['creta'];

/** The settings each app brings to Settings > General (its own section there), loaded lazily. Each feature branch lists its own; shared lists none. */
export const FEATURE_SETTINGS: FeaturePanel[] = [];

/** The parts each app brings to the Profile page (for example SnapKhata's contact details), loaded lazily. Each feature branch lists its own; shared lists none. */
export const FEATURE_PROFILE: FeaturePanel[] = [];
