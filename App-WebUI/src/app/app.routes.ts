import { Routes } from '@angular/router';
import { Speedtest } from './pages/speedtest/speedtest';
import { appGuard, authGuard } from './core/auth.guards';
import { khataLockGuard } from './core/khata-lock.guard';

const auth = () => import('./pages/auth/auth-page').then((m) => m.AuthPage);
const status = () => import('./pages/not-found/status-page').then((m) => m.StatusPage);
const staticPage = () => import('./pages/static/static-page').then((m) => m.StaticPage);

export const routes: Routes = [
  // The speed test is the home page. Each language has its own URL so search engines can index all three.
  { path: '', component: Speedtest, data: { lang: 'en' } },
  { path: 'hi', component: Speedtest, data: { lang: 'hi' } },
  { path: 'ar', component: Speedtest, data: { lang: 'ar' } },

  { path: 'HR', loadComponent: () => import('./pages/atrium/atrium').then((m) => m.Atrium), canActivate: [appGuard('hr')] },
  { path: 'hr', redirectTo: 'HR' },

  { path: 'creta', loadComponent: () => import('./pages/creta/creta').then((m) => m.Creta), canActivate: [appGuard('creta')], data: { player: 'creta' } },
  { path: 'nexon', loadComponent: () => import('./pages/creta/creta').then((m) => m.Creta), canActivate: [appGuard('nexon')], data: { player: 'nexon' } },
  { path: 'Nexon', redirectTo: 'nexon' },
  { path: 'Creta', redirectTo: 'creta' },
  { path: 'audio', redirectTo: 'creta' },

  { path: 'kunal', loadComponent: () => import('./pages/portfolio/kunal/portfolio').then((m) => m.Portfolio) },
  { path: 'Kunal', redirectTo: 'kunal' },
  { path: 'portfolio', redirectTo: 'kunal' },
  { path: 'preetik', loadComponent: () => import('./pages/portfolio/preetik/portfolio').then((m) => m.Portfolio) },
  { path: 'Preetik', redirectTo: 'preetik' },

  { path: 'youtube', loadComponent: () => import('./pages/youtube/youtube').then((m) => m.Youtube), canActivate: [appGuard('youtube')] },

  // SnapKhata: /khata is the public page, /khata/app the ledger (needs the login and the khata app). Loaded with its texts only when opened.
  { path: 'khata', loadChildren: () => import('./pages/khata/khata.mojito.routes').then((m) => m.KHATA_MOJITO_ROUTES) },

  // My Tasks: /tasks is the public page, /tasks/app the app (needs the login and the tasks app). Loaded with its texts only when opened.
  { path: 'tasks', loadChildren: () => import('./pages/tasks/tasks.mojito.routes').then((m) => m.TASKS_MOJITO_ROUTES) },

  // SnapTracker: /tracker is the public page, /tracker/app the app (needs the login and the tracker app). Loaded with its texts only when opened.
  { path: 'tracker', loadChildren: () => import('./pages/tracker/tracker.mojito.routes').then((m) => m.TRACKER_MOJITO_ROUTES) },

  // The common login of every app. One page with two modes. Mojito has no API: the demo backend in the browser answers (core/demo).
  { path: 'login', loadComponent: auth, data: { mode: 'login' } },
  { path: 'signup', loadComponent: auth, data: { mode: 'signup' } },
  { path: 'profile', loadComponent: () => import('./pages/profile/profile').then((m) => m.Profile), canActivate: [authGuard, khataLockGuard] },
  { path: 'no-access', loadComponent: status, data: { kind: 'noaccess' } },

  { path: 'about', loadComponent: staticPage, data: { kind: 'about' } },
  { path: 'privacy', loadComponent: staticPage, data: { kind: 'privacy' } },
  { path: 'terms', loadComponent: staticPage, data: { kind: 'terms' } },

  // Any logged-in user may open it; each tab shows by the rights of the user's role.
  { path: 'master', loadComponent: () => import('./pages/config/config').then((m) => m.Config), canActivate: [authGuard, khataLockGuard] },
  { path: 'config', redirectTo: 'master' },
  { path: 'disabled', loadComponent: status, data: { kind: '404' } },

  { path: 'offline', loadComponent: status, data: { kind: 'offline' } },
  { path: 'error', loadComponent: status, data: { kind: 'error' } },

  // Old address of the speed test page. speedtest.html itself is a static redirect file in /public.
  { path: 'speedtest', redirectTo: '' },

  // Anything else is "page not found".
  { path: '**', loadComponent: status, data: { kind: '404' } },
];
