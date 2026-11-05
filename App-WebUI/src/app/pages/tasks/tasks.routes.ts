import { Routes } from '@angular/router';
import { appGuard } from '../../core/auth.guards';

/**
 * My Tasks: the public page /tasks (prerendered, in the sitemap) and the app /tasks/app, open to users with access to the app (administrators open every app).
 * The Settings of the app are part of the Profile screen; the old /tasks/app/settings address leads there (with its ?tab=).
 */
export const TASKS_ROUTES: Routes = [
  { path: 'tasks', loadComponent: () => import('./landing/tasks-landing').then((m) => m.TasksLanding) },
  {
    path: 'tasks/app',
    canActivate: [appGuard('tasks')],
    loadComponent: () => import('./shell/tasks-shell').then((m) => m.TasksShell),
    children: [
      { path: '', loadComponent: () => import('./dashboard/tasks-dashboard').then((m) => m.TasksDashboard) },
      { path: 'calendar', loadComponent: () => import('./calendar/tasks-calendar').then((m) => m.TasksCalendar) },
      { path: 'settings', redirectTo: 'profile' },
      { path: 'profile', loadComponent: () => import('./profile/tasks-profile').then((m) => m.TasksProfile) },
      { path: '**', redirectTo: '' },
    ],
  },
];
