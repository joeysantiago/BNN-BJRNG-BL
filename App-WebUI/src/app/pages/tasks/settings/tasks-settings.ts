import { LANGS, Lang } from '../../../core/site';
import { TaskIcon } from '../ui/task-icon/task-icon';
import { TasksUsers } from './tasks-users/tasks-users';
import { AuthService } from '../../../core/auth.service';
import { I18nService } from '../../../core/i18n.service';
import { formatYmd, ymd } from '../../../core/tasks-dates';
import { ThemeService } from '../../../core/theme.service';
import { ThemeMode } from '../../../core/models/theme.model';
import { AppPwaService } from '../../../core/app-pwa.service';
import { SettingsService } from '../../../core/settings.service';
import { TasksApiService } from '../../../core/tasks-api.service';
import { TasksLockService } from '../../../core/tasks-lock.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TasksStateService } from '../../../core/tasks-state.service';
import { Component, ViewEncapsulation, computed, effect, inject, signal } from '@angular/core';
import { TaskCategory, TaskItem, TaskSettings, TaskSettingsTab, TaskSettingsTabInfo } from '../../../core/models/tasks.model';

const PALETTE = ['#d6489a', '#3a66f5', '#1f9d63', '#f5a524', '#8b5cf6', '#e5484d', '#0ea5b7', '#64748b'];

/**
 * The Settings of My Tasks, in tabs like SnapKhata's: General (the name of the app, appearance and defaults), App Lock, Notifications, Categories,
 * Users and Recently deleted. The Install button sits in the top bar (TasksMenus). They apply to this app only; SnapKhata and the other apps keep their own. Only a super admin may rename the app
 * (the server checks it too); access to the app is given on the common Settings page (Users), separately from every other app.
 */
@Component({
  selector: 'app-tasks-settings',
  imports: [TaskIcon, RouterLink, TasksUsers],
  templateUrl: './tasks-settings.html',
  styleUrl: './tasks-settings.scss',
  encapsulation: ViewEncapsulation.None,
})

export class TasksSettings {
  protected readonly langs = LANGS;
  protected readonly palette = PALETTE;
  protected readonly newName = signal('');
  private readonly router = inject(Router);
  protected readonly formatYmd = formatYmd;
  private readonly pwa = inject(AppPwaService);
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  protected readonly savingName = signal(false);
  private readonly api = inject(TasksApiService);
  private readonly cfg = inject(SettingsService);
  private readonly route = inject(ActivatedRoute);
  protected readonly theme = inject(ThemeService);
  protected readonly lockTimes = [0, 1, 5, 15, 30];
  protected readonly newColor = signal(PALETTE[1]);
  protected readonly lock = inject(TasksLockService);
  protected readonly state = inject(TasksStateService);
  protected readonly befores = ['0', '15m', '1h', '1d'];
  protected readonly tab = signal<TaskSettingsTab>('general');
  protected readonly deleted = signal<TaskItem[] | null>(null);
  protected readonly names = signal<Record<string, string>>({});
  protected readonly appName = computed(() => this.i18n.page('tasks'));
  protected readonly permission = signal<NotificationPermission | 'unsupported'>('default');
  /** The Users tab is for super admins only (the API checks the same rights). */
  protected readonly visibleTabs = computed(() => this.tabs.filter((t) => t.id !== 'users' || this.auth.isSuperAdmin()));
  protected readonly modes: { id: ThemeMode; icon: string }[] = [{ id: 'light', icon: 'sun' }, { id: 'dark', icon: 'moon' }, { id: 'system', icon: 'monitor' }];
  protected readonly tabs: TaskSettingsTabInfo[] = [
    { id: 'general', icon: 'gear', label: 'tasks.set.general' },
    { id: 'lock', icon: 'lock', label: 'tasks.set.lock' },
    { id: 'notifications', icon: 'bell', label: 'tasks.set.notifications' },
    { id: 'categories', icon: 'tag', label: 'tasks.set.categories' },
    { id: 'users', icon: 'users', label: 'tasks.set.users' },
    { id: 'deleted', icon: 'trash', label: 'tasks.set.deleted' },
  ];

  constructor() {
    this.route.queryParamMap.subscribe((q) => {
      const tab = q.get('tab') as TaskSettingsTab | null;
      this.tab.set(this.visibleTabs().some((t) => t.id === tab) ? tab! : 'general');
      if (this.tab() === 'deleted')
        void this.loadDeleted();
    });
    effect(() => this.names.set({ ...(this.cfg.settings().pageNames['tasks'] ?? {}) }));
    if (typeof Notification !== 'undefined')
      this.permission.set(Notification.permission);
    else
      this.permission.set('unsupported');
  }

  // #region Public Methods

  async test(): Promise<void> {
    const title = this.appName();
    const body = this.i18n.t('tasks.notify.test');
    const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (registration)
      await registration.showNotification(title, { body, icon: 'icons/tasks-192.png' });
    else
      new Notification(title, { body });
  }

  /** Turns the lock on (create a PIN) or off (enter the PIN); both happen on the lock screen. */
  toggleLock(on: boolean): void {
    this.lock.begin(on ? 'create' : 'remove');
  }

  setLanguage(code: string): void {
    this.i18n.set(code as Lang);
  }

  open(tab: TaskSettingsTab): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab }, replaceUrl: true });
  }

  deletedOn(task: TaskItem): string {
    return task.deletedOn ? formatYmd(ymd(new Date(task.deletedOn))) : '';
  }

  /** Sends a test WhatsApp message to the mobile number of the profile. */
  async testWhatsApp(): Promise<void> {
    try {
      this.state.toast((await this.api.testWhatsApp()).message ?? '');
    } catch (e) {
      this.state.toast((e as Error).message, true);
    }
  }

  async askPermission(): Promise<void> {
    this.permission.set(await Notification.requestPermission());
  }

  /** A category name: built-in ones show translated until they are renamed. */
  categoryName(c: TaskCategory): string {
    return this.state.categoryName(c);
  }

  /** Renames the app (PageNames "tasks"). The new name then shows in the header, the browser tab and the install manifest. */
  async rename(event: Event): Promise<void> {
    event.preventDefault();
    this.savingName.set(true);
    try {
      const res = await this.api.rename(this.names());
      await this.cfg.load();
      this.pwa.leave();
      this.pwa.enter('tasks');
      this.state.toast(res.message ?? '');
    } catch (e) {
      this.state.toast((e as Error).message, true);
    } finally {
      this.savingName.set(false);
    }
  }

  setName(lang: string, value: string): void {
    this.names.update((n) => ({ ...n, [lang]: value }));
  }

  async restore(task: TaskItem): Promise<void> {
    if (await this.state.restore(task.id))
      this.deleted.update((list) => (list ?? []).filter((t) => t.id !== task.id));
  }

  async addCategory(event: Event): Promise<void> {
    event.preventDefault();
    if (this.newName().trim() && (await this.state.saveCategory(null, this.newName().trim(), this.newColor()))) {
      this.newName.set('');
      this.newColor.set(PALETTE[(this.state.categories().length + 1) % PALETTE.length]);
    }
  }

  async saveCategory(c: TaskCategory, name: string, color: string): Promise<void> {
    if (name.trim() && (name.trim() !== c.name || color !== c.color))
      await this.state.saveCategory(c, name.trim(), color);
  }

  /** Saves one setting (the others stay as they are). */
  async set<K extends keyof TaskSettings>(key: K, value: TaskSettings[K]): Promise<void> {
    const current = this.state.settings();
    if (!current)
      return;
    if (await this.state.saveSettings({ ...current, [key]: value }))
      if (key === 'lockAfterMinutes')
        this.lock.status.update((s) => (s ? { ...s, lockAfterMinutes: value as number } : s));
  }

  // #endregion

  // #region Private Methods

  private async loadDeleted(): Promise<void> {
    this.deleted.set(await this.api.deleted().catch(() => []));
  }

  // #endregion
}
