import { Routes } from '@angular/router';
import { Speedtest } from './pages/speedtest/speedtest';

const status = () => import('./pages/not-found/status-page').then((m) => m.StatusPage);
const staticPage = () => import('./pages/static/static-page').then((m) => m.StaticPage);

export const routes: Routes = [
  // The speed test is the home page. Each language has its own URL so search engines can index all three.
  { path: '', component: Speedtest, data: { lang: 'en' } },
  { path: 'hi', component: Speedtest, data: { lang: 'hi' } },
  { path: 'ar', component: Speedtest, data: { lang: 'ar' } },

  { path: 'HR', loadComponent: () => import('./pages/atrium/atrium').then((m) => m.Atrium) },
  { path: 'hr', redirectTo: 'HR' },

  { path: 'creta', loadComponent: () => import('./pages/creta/creta').then((m) => m.Creta) },
  { path: 'Creta', redirectTo: 'creta' },
  { path: 'audio', redirectTo: 'creta' },

  { path: 'about', loadComponent: staticPage, data: { kind: 'about' } },
  { path: 'privacy', loadComponent: staticPage, data: { kind: 'privacy' } },
  { path: 'terms', loadComponent: staticPage, data: { kind: 'terms' } },

  { path: 'offline', loadComponent: status, data: { kind: 'offline' } },
  { path: 'error', loadComponent: status, data: { kind: 'error' } },

  // Old address of the speed test page. speedtest.html itself is a static redirect file in /public.
  { path: 'speedtest', redirectTo: '' },

  // Anything else is "page not found".
  { path: '**', loadComponent: status, data: { kind: '404' } },
];
