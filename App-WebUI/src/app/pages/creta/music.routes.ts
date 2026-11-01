import { Routes } from '@angular/router';
import { appGuard } from '../../core/auth.guards';

const player = () => import('./creta').then((m) => m.Creta);
const upload = () => import('../creta-add/creta-add').then((m) => m.CretaAdd);

/** Creta and Nexon audio players and their upload pages. Each player needs the login and access to that app. */
export const MUSIC_ROUTES: Routes = [
  { path: 'creta', loadComponent: player, canActivate: [appGuard('creta')], data: { player: 'creta' } },
  { path: 'nexon', loadComponent: player, canActivate: [appGuard('nexon')], data: { player: 'nexon' } },
  { path: 'creta-add', loadComponent: upload, canActivate: [appGuard('creta')], data: { player: 'creta' } },
  { path: 'nexon-add', loadComponent: upload, canActivate: [appGuard('nexon')], data: { player: 'nexon' } },
  { path: 'Nexon', redirectTo: 'nexon' },
  { path: 'Creta', redirectTo: 'creta' },
  { path: 'audio', redirectTo: 'creta' },
];
