import { Routes } from '@angular/router';
import { TRACKER_ROUTES } from './tracker.routes';
import { TRACKER_TEXTS } from '../../i18n/tracker';
import { I18nService } from '../../core/i18n.service';
import { inject, provideEnvironmentInitializer } from '@angular/core';

/**
 * SnapTracker in Mojito: the same routes as the API branches will have (tracker.routes.ts), loaded under /tracker only when one of its pages opens.
 * They first add SnapTracker's texts (i18n/tracker.ts), which the API branches will load from the Translations table, so the rest of the site does not carry them.
 * The SnapTracker calls are answered by the demo backend (core/demo/tracker-demo.ts), as the login and Settings calls are.
 */
export const TRACKER_MOJITO_ROUTES: Routes = [
  {
    path: '',
    providers: [provideEnvironmentInitializer(() => inject(I18nService).extend(TRACKER_TEXTS))],
    children: TRACKER_ROUTES.map((route) => ({ ...route, path: (route.path ?? '').replace(/^tracker\/?/, '') })),
  },
];
