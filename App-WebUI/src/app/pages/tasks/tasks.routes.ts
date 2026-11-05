import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { appGuard } from '../../core/auth.guards';

const toSettings = () => inject(Router).createUrlTree(['/master'], { queryParams: { tab: 'general', app: 'tasks' } });

/**
 * My Tasks: the public page /tasks (prerendered, in the sitemap) and the app /tasks/app, open to users with access to the app (administrators open every app).
 * My Tasks has no settings or profile page of its own: Settings > General (its section) and /profile are shared by every app; the old addresses lead there.
 */
export const TASKS_ROUTES: Routes = [
  { path: 'tasks', loadComponent: () => import('./landing/tasks-landing').then((m) => m.TasksLanding) },
  { path: 'tasks/app/profile', redirectTo: '/profile' },
  { path: 'tasks/app/settings', redirectTo: toSettings },
  {
    path: 'tasks/app',
    canActivate: [appGuard('tasks')],
    loadComponent: () => import('./shell/tasks-shell').then((m) => m.TasksShell),
    children: [
      { path: '', loadComponent: () => import('./dashboard/tasks-dashboard').then((m) => m.TasksDashboard) },
      { path: 'calendar', loadComponent: () => import('./calendar/tasks-calendar').then((m) => m.TasksCalendar) },
      { path: '**', redirectTo: '' },
    ],
  },
];
