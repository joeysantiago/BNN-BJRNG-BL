import { Routes } from '@angular/router';
import { TASKS_ROUTES } from './tasks.routes';
import { TASKS_TEXTS } from '../../i18n/tasks';
import { I18nService } from '../../core/i18n.service';
import { inject, provideEnvironmentInitializer } from '@angular/core';

/**
 * My Tasks in Mojito: the same routes as the API branches (tasks.routes.ts, unchanged), loaded under /tasks only when one of its pages opens.
 * They first add the texts of My Tasks (i18n/tasks.ts), which the API branches load from the Translations table, so the rest of the site does not carry them.
 * The My Tasks calls are answered by the demo backend (core/demo/tasks-demo.ts), as the login and Settings calls are.
 */
export const TASKS_MOJITO_ROUTES: Routes = [
  {
    path: '',
    providers: [provideEnvironmentInitializer(() => inject(I18nService).extend(TASKS_TEXTS))],
    children: TASKS_ROUTES.map((route) => ({ ...route, path: (route.path ?? '').replace(/^tasks\/?/, '') })),
  },
];
