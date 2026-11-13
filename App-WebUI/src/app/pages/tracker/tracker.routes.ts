import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { appGuard } from '../../core/auth.guards';

const toSettings = () => inject(Router).createUrlTree(['/master'], { queryParams: { tab: 'general', app: 'tracker' } });

/**
 * SnapTracker: the public page /tracker (prerendered, in the sitemap) and the app /tracker/app, open to users with access to the app (administrators open every app).
 * SnapTracker has no settings or profile page of its own: Settings > General (its section) and /profile are shared by every app; the prototype's addresses lead there.
 */
export const TRACKER_ROUTES: Routes = [
  { path: 'tracker', loadComponent: () => import('./landing/tracker-landing').then((m) => m.TrackerLanding) },
  { path: 'tracker/app/profile', redirectTo: '/profile' },
  { path: 'tracker/app/settings', redirectTo: toSettings },
  {
    path: 'tracker/app',
    canActivate: [appGuard('tracker')],
    loadComponent: () => import('./shell/tracker-shell').then((m) => m.TrackerShell),
    children: [
      { path: '', loadComponent: () => import('./dashboard/tracker-dashboard').then((m) => m.TrackerDashboard) },
      { path: 'transactions', loadComponent: () => import('./transactions/tracker-transactions').then((m) => m.TrackerTransactions) },
      { path: 'cards', loadComponent: () => import('./cards/tracker-cards').then((m) => m.TrackerCards) },
      // SMS reading and privacy are now a part of the How page.
      { path: 'privacy', redirectTo: 'how' },
      { path: 'alerts', loadComponent: () => import('./alerts/tracker-alerts').then((m) => m.TrackerAlerts) },
      { path: 'how', loadComponent: () => import('./how/tracker-how').then((m) => m.TrackerHow) },
      { path: '**', redirectTo: '' },
    ],
  },
];
