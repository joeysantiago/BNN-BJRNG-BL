import { Routes } from '@angular/router';
import { appGuard } from '../../core/auth.guards';
import { isNativeApp } from '../../core/native-app';

/** Atrium HR. Needs the login and access to the hr app. The Android app leaves it out for now (core/apps.ts NATIVE_HIDDEN_APPS): /HR is "page not found" there. */
export const HR_ROUTES: Routes = [
  { path: 'HR', loadComponent: () => import('./atrium').then((m) => m.Atrium), canMatch: [() => !isNativeApp()], canActivate: [appGuard('hr')] },
  { path: 'hr', redirectTo: 'HR' },
];
