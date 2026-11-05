import { Routes } from '@angular/router';
import HR_PAGES from './pages/atrium/hr.pages.json';
import { HR_ROUTES } from './pages/atrium/hr.routes';
import MUSIC_PAGES from './pages/creta/music.pages.json';
import KHATA_PAGES from './pages/khata/khata.pages.json';
import TASKS_PAGES from './pages/tasks/tasks.pages.json';
import { MUSIC_ROUTES } from './pages/creta/music.routes';
import { KHATA_ROUTES } from './pages/khata/khata.routes';
import { TASKS_ROUTES } from './pages/tasks/tasks.routes';
import { SitePages } from './core/models/site-pages.model';
import YOUTUBE_PAGES from './pages/youtube/youtube.pages.json';
import { YOUTUBE_ROUTES } from './pages/youtube/youtube.routes';
import { FeaturePanel } from './core/models/feature-panel.model';
import SPEEDTEST_PAGES from './pages/speedtest/speedtest.pages.json';
import { SPEEDTEST_ROUTES } from './pages/speedtest/speedtest.routes';

/**
 * Every feature brings its own routes file and *.pages.json (prerender list and sitemap entries) inside its folder.
 * Each feature branch adds its own import and entry in both lists below (shared lists none, main lists all). The speed test stays first: it is the home page.
 * scripts/postbuild.mjs finds the *.pages.json files by itself.
 */
export const FEATURE_ROUTES: Routes = [...SPEEDTEST_ROUTES, ...MUSIC_ROUTES, ...YOUTUBE_ROUTES, ...KHATA_ROUTES, ...TASKS_ROUTES, ...HR_ROUTES];

export const FEATURE_PAGES: SitePages[] = [SPEEDTEST_PAGES, MUSIC_PAGES, YOUTUBE_PAGES, KHATA_PAGES, TASKS_PAGES, HR_PAGES];

/** The apps this branch holds (app codes of core/apps.ts, plus 'speedtest'). The Settings page shows only their settings and access boxes. */
export const FEATURE_APPS: string[] = ['speedtest', 'creta', 'nexon', 'youtube', 'khata', 'tasks', 'tracker', 'hr'];

/** The settings each app brings to Settings > General (its own section there), loaded lazily. Each feature branch lists its own; shared lists none. */
export const FEATURE_SETTINGS: FeaturePanel[] = [];

/** The parts each app brings to the Profile page (for example deleting the data a user keeps in that app), loaded lazily. Each feature branch lists its own; shared lists none. */
export const FEATURE_PROFILE: FeaturePanel[] = [];
