import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { appGuard } from '../../core/auth.guards';

const toLogin = () => inject(Router).createUrlTree(['/login'], { queryParams: { next: '/khata/app' } });

/**
 * SnapKhata: /khata is the public page; the app itself (/khata/app) needs the common login and access to the khata app.
 * Inside a book (b/:bookId): the dashboard, parties, all entries, a party's ledger and settings, an entry's details, and the add / edit entry form.
 */
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
      { path: 'profile', loadComponent: () => import('./profile/khata-profile').then((m) => m.KhataProfile) },
      { path: 'settings', loadComponent: () => import('./settings/khata-settings').then((m) => m.KhataSettings) },
      { path: 'b/:bookId', loadComponent: () => import('./dashboard/khata-dashboard').then((m) => m.KhataDashboard) },
      { path: 'b/:bookId/new', loadComponent: () => import('./entry-form/khata-entry-form').then((m) => m.KhataEntryForm) },
      { path: 'b/:bookId/parties', loadComponent: () => import('./parties/khata-parties').then((m) => m.KhataParties) },
      { path: 'b/:bookId/entries', loadComponent: () => import('./entries/khata-entries').then((m) => m.KhataEntries) },
      { path: 'b/:bookId/e/:entryId', loadComponent: () => import('./entry/khata-entry').then((m) => m.KhataEntryDetails) },
      { path: 'b/:bookId/e/:entryId/edit', loadComponent: () => import('./entry-form/khata-entry-form').then((m) => m.KhataEntryForm) },
      { path: 'b/:bookId/contact/:contactId', loadComponent: () => import('./ledger/khata-ledger').then((m) => m.KhataLedger) },
      { path: 'b/:bookId/contact/:contactId/settings', loadComponent: () => import('./contact-settings/khata-contact-settings').then((m) => m.KhataContactSettings) },
      { path: '**', loadComponent: () => import('./ui/khata-missing/khata-missing').then((m) => m.KhataMissing) },
    ],
  },
];
