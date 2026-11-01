import SHARED_PAGES from './shared.pages.json';
import { FEATURE_PAGES } from './feature-routes';
import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Every real page is prerendered to plain HTML at build time, so search engines and social crawlers read full content.
 * The list comes from shared.pages.json and each feature's *.pages.json (see feature-routes.ts); scripts/postbuild.mjs checks the same lists.
 * Redirects and unknown URLs are rendered in the browser. scripts/postbuild.mjs turns the browser shell into 404.html,
 * which the web server serves for any address that has no file.
 *
 * Redirects such as /hr and /Creta must not be prerendered: on a case-insensitive disk they would overwrite /HR and /creta.
 */
const pages = [...FEATURE_PAGES, SHARED_PAGES].flatMap((p) => p.prerender);

export const serverRoutes: ServerRoute[] = [
  ...pages.map((path): ServerRoute => ({ path, renderMode: RenderMode.Prerender })),
  { path: '**', renderMode: RenderMode.Client },
];
