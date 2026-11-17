import { FEATURES } from './features';
import { Routes } from '@angular/router';
import { AppLink } from './models/auth.model';
import { FeatureId } from './models/app-settings.model';

/** Every app a user can be given (same codes as the Apps table of the API), with its name and the page that opens it. */
export const APP_LINKS: readonly AppLink[] = [
  { code: 'khata', name: 'auth.app.khata', path: '/khata/app' },
  { code: 'tracker', name: 'auth.app.tracker', path: null },
  { code: 'creta', name: 'auth.app.creta', path: '/creta' },
  { code: 'nexon', name: 'auth.app.nexon', path: '/nexon' },
  { code: 'youtube', name: 'auth.app.youtube', path: '/youtube' },
  { code: 'hr', name: 'auth.app.hr', path: '/HR' },
];

/** The link of an app code, or a plain entry for a code this site does not know yet (its name is the code). */
export const appLink = (code: string): AppLink => APP_LINKS.find((a) => a.code === code) ?? { code, name: code, path: null };

/** The app whose own window this is (an installed app runs at /apps/<code>/, a one-app Android app at /apps/<code>/index.html), else null (also on the server). */
export const ownApp = (): string | null => (typeof location === 'undefined' ? null : (/^\/apps\/([a-z]+)(\/|\/index\.html)?$/.exec(location.pathname)?.[1] ?? null));

/**
 * The apps a user may open: every app for an administrator, else the user's own. An app's own window lists only that app. An app whose page is
 * switched off in Settings > Site options (page.<code>, read with `on`) is left out. A branch may not have every
 * app's pages: an app whose page is not routed here is listed without a link (path null).
 */
export function userApps(admin: boolean, codes: readonly string[], routes: Routes, on: (id: FeatureId) => boolean): AppLink[] {
  const own = ownApp();
  return (admin ? APP_LINKS : codes.map(appLink))
    .filter((a) => (!own || a.code === own) && appPageOn(a.code, on))
    .map((a) => (a.path && routes.some((r) => r.path === a.path!.split('/')[1]) ? a : { ...a, path: null }));
}

/** False when the app has a page switch (page.<code> in FEATURES) and it is off; an app without a switch is always listed. */
function appPageOn(code: string, on: (id: FeatureId) => boolean): boolean {
  const id = `page.${code}` as FeatureId;
  return !FEATURES.some((f) => f.id === id) || on(id);
}
