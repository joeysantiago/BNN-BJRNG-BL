import { Routes } from '@angular/router';
import { appGuard } from '../../core/auth.guards';

const player = () => import('./creta').then((m) => m.Creta);
const upload = () => import('../creta-add/creta-add').then((m) => m.CretaAdd);

/** The Creta audio player and its upload page. Each player needs the login and access to that app. */
export const MUSIC_ROUTES: Routes = [
  { path: 'creta', loadComponent: player, canActivate: [appGuard('creta')], data: { player: 'creta' } },
  { path: 'creta-add', loadComponent: upload, canActivate: [appGuard('creta')], data: { player: 'creta' } },
  { path: 'Creta', redirectTo: 'creta' },
  { path: 'audio', redirectTo: 'creta' },
];
