import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { appGuard } from '../../core/auth.guards';

const toLogin = () => inject(Router).createUrlTree(['/login'], { queryParams: { next: '/khata/app' } });

/** SnapKhata: /khata is the public page; the app itself (/khata/app) needs the common login and access to the khata app. */
export const KHATA_ROUTES: Routes = [
  { path: 'khata', loadComponent: () => import('./landing/khata-landing').then((m) => m.KhataLanding) },
  // Old addresses of the removed one-time-code login and PIN screens.
  { path: 'khata/login', redirectTo: toLogin },
  { path: 'khata/set-pin', redirectTo: '/khata/app' },
  { path: 'khata/unlock', redirectTo: '/khata/app' },
  {
    path: 'khata/app',
    loadComponent: () => import('./shell/khata-shell').then((m) => m.KhataShell),
    canActivate: [appGuard('khata')],
    children: [
      { path: '', loadComponent: () => import('./home/khata-home').then((m) => m.KhataHome) },
      { path: 'books', loadComponent: () => import('./books/khata-books').then((m) => m.KhataBooks) },
      // Account settings (name, language, password, log out) live on the shared /profile page.
      { path: 'profile', redirectTo: '/profile' },
      { path: 'b/:bookId', loadComponent: () => import('./contacts/khata-contacts').then((m) => m.KhataContacts) },
      { path: 'b/:bookId/contact/:contactId', loadComponent: () => import('./ledger/khata-ledger').then((m) => m.KhataLedger) },
      { path: 'b/:bookId/contact/:contactId/settings', loadComponent: () => import('./contact-settings/khata-contact-settings').then((m) => m.KhataContactSettings) },
    ],
  },
];
