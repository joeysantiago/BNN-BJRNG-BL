import { AuthService } from './auth.service';
import { isPlatformServer } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

/**
 * Logged in, and when `code` is given, allowed to open that app (administrators open every app). Without a login the visitor goes to
 * /login and comes back afterwards; without access to the "no access" page. The server prerender always passes, so the prerendered HTML keeps
 * the page's content for search engines; the browser enforces the rule.
 */
function gate(url: string, code?: string): boolean | Promise<boolean | UrlTree> {
  if (isPlatformServer(inject(PLATFORM_ID)))
    return true;
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.ensureSession().then((ok) => {
    if (!ok)
      return router.createUrlTree(['/login'], { queryParams: { next: url } });
    return !code || auth.hasApp(code) || router.createUrlTree(['/no-access'], { queryParams: { app: code } });
  });
}

/** Any logged-in user: /profile and /master (whose admin parts check isAdmin). */
export const authGuard: CanActivateFn = (_route, state) => gate(state.url);

/** Logged in with access to one app, for example appGuard('creta'). */
export const appGuard = (code: string): CanActivateFn => (_route, state) => gate(state.url, code);
