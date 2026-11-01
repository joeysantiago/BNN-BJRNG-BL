import { Routes } from '@angular/router';
import { SitePages } from './core/models/site-pages.model';

/**
 * Every feature brings its own routes file and *.pages.json (prerender list and sitemap entries) inside its folder.
 * Each feature branch adds its own import and entry in both lists below (shared lists none, main lists all). The speed test stays first: it is the home page.
 * scripts/postbuild.mjs finds the *.pages.json files by itself.
 */
export const FEATURE_ROUTES: Routes = [{ path: '', pathMatch: 'full', redirectTo: 'profile' }];

export const FEATURE_PAGES: SitePages[] = [];
