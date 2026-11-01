import { Routes } from '@angular/router';
import { appGuard } from '../../core/auth.guards';

const player = () => import('./creta').then((m) => m.Creta);
const upload = () => import('../creta-add/creta-add').then((m) => m.CretaAdd);

/** The Nexon audio player and its upload page. Each player needs the login and access to that app. */
export const MUSIC_ROUTES: Routes = [
  { path: 'nexon', loadComponent: player, canActivate: [appGuard('nexon')], data: { player: 'nexon' } },
  { path: 'nexon-add', loadComponent: upload, canActivate: [appGuard('nexon')], data: { player: 'nexon' } },
  { path: 'Nexon', redirectTo: 'nexon' },
];
