import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guards';
import { FEATURE_ROUTES } from './feature-routes';
import { khataLockGuard } from './core/khata-lock.guard';

const auth = () => import('./pages/auth/auth-page').then((m) => m.AuthPage);
const status = () => import('./pages/not-found/status-page').then((m) => m.StatusPage);
const staticPage = () => import('./pages/static/static-page').then((m) => m.StaticPage);

/** Shared pages of every branch. Each feature's routes come from feature-routes.ts (speed test first); "page not found" stays last. */
export const routes: Routes = [
  ...FEATURE_ROUTES,

  // The common login of every app. One page with two modes.
  { path: 'login', loadComponent: auth, data: { mode: 'login' } },
  { path: 'signup', loadComponent: auth, data: { mode: 'signup' } },
  { path: 'profile', loadComponent: () => import('./pages/profile/profile').then((m) => m.Profile), canActivate: [authGuard, khataLockGuard] },
  { path: 'no-access', loadComponent: status, data: { kind: 'noaccess' } },

  { path: 'about', loadComponent: staticPage, data: { kind: 'about' } },
  { path: 'privacy', loadComponent: staticPage, data: { kind: 'privacy' } },
  { path: 'terms', loadComponent: staticPage, data: { kind: 'terms' } },

  // Any logged-in user may open it; saving settings and the Users and access panel are for administrators only.
  { path: 'master', loadComponent: () => import('./pages/config/config').then((m) => m.Config), canActivate: [authGuard, khataLockGuard] },
  { path: 'config', redirectTo: 'master' },
  { path: 'disabled', loadComponent: status, data: { kind: '404' } },

  { path: 'offline', loadComponent: status, data: { kind: 'offline' } },
  { path: 'error', loadComponent: status, data: { kind: 'error' } },

  // Anything else is "page not found".
  { path: '**', loadComponent: status, data: { kind: '404' } },
];
