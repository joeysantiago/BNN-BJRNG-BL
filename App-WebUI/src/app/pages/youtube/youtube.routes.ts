import { Routes } from '@angular/router';
import { appGuard } from '../../core/auth.guards';

/** YouTube music player. Needs the login and access to the youtube app. */
export const YOUTUBE_ROUTES: Routes = [{ path: 'youtube', loadComponent: () => import('./youtube').then((m) => m.Youtube), canActivate: [appGuard('youtube')] }];
