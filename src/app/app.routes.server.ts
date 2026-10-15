import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Every real page is prerendered to plain HTML at build time, so search engines and social crawlers read full content.
 * Redirects and unknown URLs are rendered in the browser. scripts/postbuild.mjs turns the browser shell into 404.html,
 * which GitHub Pages serves for any address that has no file.
 *
 * Redirects such as /hr and /Creta must not be prerendered: on a case-insensitive disk they would overwrite /HR and /creta.
 */
const pages = ['', 'hi', 'ar', 'HR', 'creta', 'nexon', 'about', 'privacy', 'terms', 'offline', 'error'];

export const serverRoutes: ServerRoute[] = [
  ...pages.map((path): ServerRoute => ({ path, renderMode: RenderMode.Prerender })),
  { path: '**', renderMode: RenderMode.Client },
];
