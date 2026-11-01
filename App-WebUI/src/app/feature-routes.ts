import { Routes } from '@angular/router';
import HR_PAGES from './pages/atrium/hr.pages.json';
import { HR_ROUTES } from './pages/atrium/hr.routes';
import MUSIC_PAGES from './pages/creta/music.pages.json';
import KHATA_PAGES from './pages/khata/khata.pages.json';
import { MUSIC_ROUTES } from './pages/creta/music.routes';
import { KHATA_ROUTES } from './pages/khata/khata.routes';
import { SitePages } from './core/models/site-pages.model';
import YOUTUBE_PAGES from './pages/youtube/youtube.pages.json';
import { YOUTUBE_ROUTES } from './pages/youtube/youtube.routes';
import SPEEDTEST_PAGES from './pages/speedtest/speedtest.pages.json';
import { SPEEDTEST_ROUTES } from './pages/speedtest/speedtest.routes';

/**
 * Every feature brings its own routes file and *.pages.json (prerender list and sitemap entries) inside its folder.
 * Each feature branch adds its own import and entry in both lists below (shared lists none, main lists all). The speed test stays first: it is the home page.
 * scripts/postbuild.mjs finds the *.pages.json files by itself.
 */
export const FEATURE_ROUTES: Routes = [...SPEEDTEST_ROUTES, ...MUSIC_ROUTES, ...YOUTUBE_ROUTES, ...KHATA_ROUTES, ...HR_ROUTES];

export const FEATURE_PAGES: SitePages[] = [SPEEDTEST_PAGES, MUSIC_PAGES, YOUTUBE_PAGES, KHATA_PAGES, HR_PAGES];
