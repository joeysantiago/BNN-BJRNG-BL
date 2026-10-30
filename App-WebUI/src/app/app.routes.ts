import { Routes } from '@angular/router';
import { Speedtest } from './pages/speedtest/speedtest';
import { khataSessionGuard, khataUnlockedGuard } from './core/khata.guards';

const status = () => import('./pages/not-found/status-page').then((m) => m.StatusPage);
const khataPin = () => import('./pages/khata/pin/khata-pin').then((m) => m.KhataPin);
const staticPage = () => import('./pages/static/static-page').then((m) => m.StaticPage);

export const routes: Routes = [
  // The speed test is the home page. Each language has its own URL so search engines can index all three.
  { path: '', component: Speedtest, data: { lang: 'en' } },
  { path: 'hi', component: Speedtest, data: { lang: 'hi' } },
  { path: 'ar', component: Speedtest, data: { lang: 'ar' } },

  { path: 'HR', loadComponent: () => import('./pages/atrium/atrium').then((m) => m.Atrium) },
  { path: 'hr', redirectTo: 'HR' },

  { path: 'creta', loadComponent: () => import('./pages/creta/creta').then((m) => m.Creta), data: { player: 'creta' } },
  { path: 'nexon', loadComponent: () => import('./pages/creta/creta').then((m) => m.Creta), data: { player: 'nexon' } },
  { path: 'creta-add', loadComponent: () => import('./pages/creta-add/creta-add').then((m) => m.CretaAdd), data: { player: 'creta' } },
  { path: 'nexon-add', loadComponent: () => import('./pages/creta-add/creta-add').then((m) => m.CretaAdd), data: { player: 'nexon' } },
  { path: 'Nexon', redirectTo: 'nexon' },
  { path: 'Creta', redirectTo: 'creta' },
  { path: 'audio', redirectTo: 'creta' },

  { path: 'youtube', loadComponent: () => import('./pages/youtube/youtube').then((m) => m.Youtube) },

  // SnapKhata: /khata is the public page; the app itself needs a login and the PIN (guards), and every fresh start asks for the PIN again.
  { path: 'khata', loadComponent: () => import('./pages/khata/landing/khata-landing').then((m) => m.KhataLanding) },
  { path: 'khata/login', loadComponent: () => import('./pages/khata/login/khata-login').then((m) => m.KhataLogin) },
  { path: 'khata/set-pin', loadComponent: khataPin, canActivate: [khataSessionGuard], data: { mode: 'set' } },
  { path: 'khata/unlock', loadComponent: khataPin, canActivate: [khataSessionGuard], data: { mode: 'unlock' } },
  {
    path: 'khata/app',
    loadComponent: () => import('./pages/khata/shell/khata-shell').then((m) => m.KhataShell),
    canActivate: [khataUnlockedGuard],
    canActivateChild: [khataUnlockedGuard],
    children: [
      { path: '', loadComponent: () => import('./pages/khata/home/khata-home').then((m) => m.KhataHome) },
      { path: 'books', loadComponent: () => import('./pages/khata/books/khata-books').then((m) => m.KhataBooks) },
      { path: 'profile', loadComponent: () => import('./pages/khata/profile/khata-profile').then((m) => m.KhataProfile) },
      { path: 'b/:bookId', loadComponent: () => import('./pages/khata/contacts/khata-contacts').then((m) => m.KhataContacts) },
      { path: 'b/:bookId/contact/:contactId', loadComponent: () => import('./pages/khata/ledger/khata-ledger').then((m) => m.KhataLedger) },
      { path: 'b/:bookId/contact/:contactId/settings', loadComponent: () => import('./pages/khata/contact-settings/khata-contact-settings').then((m) => m.KhataContactSettings) },
    ],
  },

  { path: 'about', loadComponent: staticPage, data: { kind: 'about' } },
  { path: 'privacy', loadComponent: staticPage, data: { kind: 'privacy' } },
  { path: 'terms', loadComponent: staticPage, data: { kind: 'terms' } },

  { path: 'master', loadComponent: () => import('./pages/config/config').then((m) => m.Config) },
  { path: 'config', redirectTo: 'master' },
  { path: 'disabled', loadComponent: status, data: { kind: '404' } },

  { path: 'offline', loadComponent: status, data: { kind: 'offline' } },
  { path: 'error', loadComponent: status, data: { kind: 'error' } },

  // Old address of the speed test page. speedtest.html itself is a static redirect file in /public.
  { path: 'speedtest', redirectTo: '' },

  // Anything else is "page not found".
  { path: '**', loadComponent: status, data: { kind: '404' } },
];
