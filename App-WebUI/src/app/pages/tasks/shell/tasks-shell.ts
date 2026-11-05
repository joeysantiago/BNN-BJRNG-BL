import { filter, map, startWith } from 'rxjs';
import { Title } from '@angular/platform-browser';
import { TaskIcon } from '../ui/task-icon/task-icon';
import { toSignal } from '@angular/core/rxjs-interop';
import { TasksLock } from '../ui/tasks-lock/tasks-lock';
import { AuthService } from '../../../core/auth.service';
import { I18nService } from '../../../core/i18n.service';
import { UserAvatar } from '../../../shared/user-avatar';
import { ThemeService } from '../../../core/theme.service';
import { TaskEditor } from '../ui/task-editor/task-editor';
import { TasksMenus } from '../ui/tasks-menus/tasks-menus';
import { AppPwaService } from '../../../core/app-pwa.service';
import { TasksLockService } from '../../../core/tasks-lock.service';
import { TasksOverlays } from '../ui/tasks-overlays/tasks-overlays';
import { TasksStateService } from '../../../core/tasks-state.service';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Component, OnDestroy, ViewEncapsulation, afterNextRender, computed, effect, inject } from '@angular/core';

/**
 * The frame of the My Tasks app: a rail on wide screens, a top bar and bottom tabs with the Add button on phones, the lock screen, the task editor,
 * and the reminders bell, picture viewer and toasts (TasksOverlays). The name of the app comes from the database (PageNames, code "tasks"), so a new name shows here,
 * in the browser tab and in the install manifest. The site header and footer are hidden on these screens (app.ts).
 */
@Component({
  selector: 'app-tasks-shell',
  imports: [RouterOutlet, RouterLink, TaskIcon, TasksLock, TaskEditor, TasksMenus, TasksOverlays, UserAvatar],
  templateUrl: './tasks-shell.html',
  styleUrl: './tasks-shell.scss',
  encapsulation: ViewEncapsulation.None,
})

export class TasksShell implements OnDestroy {
  private readonly title = inject(Title);
  private readonly router = inject(Router);
  private readonly pwa = inject(AppPwaService);
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  protected readonly theme = inject(ThemeService);
  protected readonly lock = inject(TasksLockService);
  protected readonly state = inject(TasksStateService);
  protected readonly appName = computed(() => this.i18n.page('tasks'));
  protected readonly crumb = computed(() => this.i18n.t('tasks.nav.' + (this.screen() || 'tasks')));
  /** The screen that is open: the path after /tasks/app (empty for the task list). */
  protected readonly screen = computed(() => this.url().split(/[?#]/)[0].replace(/^\/tasks\/app\/?/, '').split('/')[0]);
  private readonly url = toSignal(this.router.events.pipe(filter((e) => e instanceof NavigationEnd), map(() => this.router.url), startWith(this.router.url)), { initialValue: this.router.url });
  protected readonly nav = [
    { path: '/tasks/app', icon: 'tasks', label: 'tasks.nav.tasks', exact: true },
    { path: '/tasks/app/calendar', icon: 'cal', label: 'tasks.nav.calendar', exact: false },
  ];

  constructor() {
    effect(() => this.title.setTitle(`${this.crumb()} · ${this.appName()}`));
    effect(() => {
      if (this.lock.open())
        void this.state.load();
    });
    afterNextRender(() => {
      this.pwa.enter('tasks');
      void this.lock.start();
    });
  }

  // #region Public Methods

  ngOnDestroy(): void {
    this.pwa.leave();
  }

  /** Opens the task list and puts the cursor in its search box. */
  async search(): Promise<void> {
    await this.router.navigate(['/tasks/app']);
    setTimeout(() => document.getElementById('tasks-q')?.focus(), 60);
  }

  /** The bottom tab or rail link of the screen that is open. */
  current(path: string): string | null {
    const screen = path.replace(/^\/tasks\/app\/?/, '');
    return screen === this.screen() ? 'page' : null;
  }

  // #endregion
}
