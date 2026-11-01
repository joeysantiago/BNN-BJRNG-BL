import { Routes } from '@angular/router';
import { appGuard } from '../../core/auth.guards';

/** Atrium HR. Needs the login and access to the hr app. */
export const HR_ROUTES: Routes = [
  { path: 'HR', loadComponent: () => import('./atrium').then((m) => m.Atrium), canActivate: [appGuard('hr')] },
  { path: 'hr', redirectTo: 'HR' },
];
