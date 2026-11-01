import { AppLink } from './models/auth.model';

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
