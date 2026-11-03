import { Routes } from '@angular/router';
import { KHATA_ROUTES } from './khata.routes';
import { KHATA_TEXTS } from '../../i18n/khata';
import { I18nService } from '../../core/i18n.service';
import { inject, provideEnvironmentInitializer } from '@angular/core';

/**
 * SnapKhata in Mojito: the same routes as the API branches (khata.routes.ts, unchanged), loaded under /khata only when one of its pages opens.
 * They first add SnapKhata's texts (i18n/khata.ts), which the API branches load from the Translations table, so the rest of the site does not carry them.
 * The SnapKhata calls are answered by the demo backend (core/demo/khata-demo.ts), as the login and Settings calls are.
 */
export const KHATA_MOJITO_ROUTES: Routes = [
  {
    path: '',
    providers: [provideEnvironmentInitializer(() => inject(I18nService).extend(KHATA_TEXTS))],
    children: KHATA_ROUTES.map((route) => ({ ...route, path: (route.path ?? '').replace(/^khata\/?/, '') })),
  },
];
