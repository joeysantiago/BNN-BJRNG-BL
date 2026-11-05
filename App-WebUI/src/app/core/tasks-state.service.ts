import { I18nService } from './i18n.service';
import { isPlatformBrowser } from '@angular/common';
import { TasksApiService } from './tasks-api.service';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { addDays, clockOf, formatYmd, groupTasks, inScope, inTab, isDone, isOverdue, matches, monthLabel, parseYmd, periodsOf, sortTasks, timeOf, weekRange, ymd } from './tasks-dates';
import { TaskCategory, TaskChanges, TaskConfirm, TaskEditorState, TaskItem, TaskReminder, TaskRequest, TaskSettings, TaskSort, TaskSummary, TaskTab, TaskToast, TaskViewerState } from './models/tasks.model';

const TICK_MS = 30000;
const TOAST_MS = 4500;
const NOTIFIED_KEY = 'tasks-notified';
const BEFORE_MINUTES: Record<string, number> = { '0': 0, '15m': 15, '1h': 60, '1d': 1440 };

/**
 * The state of the My Tasks app: the tasks, categories and settings of the user, the dashboard filters (primary tab x date scope x category x search),
 * the selection, the editor, the picture viewer and the toasts. Every list is a computed signal, so a change shows everywhere at once. The clock ticks,
 * so a task moves to Today, Current week or Overdue by itself when its day comes, without a reload.
 */
@Injectable({ providedIn: 'root' })

export class TasksStateService {
  private toastId = 0;
  readonly query = signal('');
  readonly bell = signal(false);
  readonly scope = signal('all');
  readonly failed = signal(false);
  readonly loaded = signal(false);
  readonly selecting = signal(false);
  readonly moment = signal(new Date());
  readonly sort = signal<TaskSort>('due');
  readonly tasks = signal<TaskItem[]>([]);
  readonly tab = signal<TaskTab>('active');
  readonly toasts = signal<TaskToast[]>([]);
  private readonly i18n = inject(I18nService);
  readonly flash = signal<number | null>(null);
  private readonly api = inject(TasksApiService);
  private timer?: ReturnType<typeof setInterval>;
  readonly ask = signal<TaskConfirm | null>(null);
  readonly categories = signal<TaskCategory[]>([]);
  readonly category = signal<number | 'all'>('all');
  readonly settings = signal<TaskSettings | null>(null);
  readonly editor = signal<TaskEditorState | null>(null);
  readonly viewer = signal<TaskViewerState | null>(null);
  readonly expanded = signal<ReadonlySet<number>>(new Set());
  readonly selected = signal<ReadonlySet<number>>(new Set());
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly periods = computed(() => periodsOf(this.tasks(), this.clock()));
  readonly locale = computed(() => this.i18n.info().locale.replace('_', '-'));
  readonly clock = computed(() => clockOf(this.moment(), this.settings()?.weekStart === 'sun'));
  readonly filtered = computed(() => this.tasks().filter((t) => this.passes(t, this.tab(), this.scope(), this.category())));
  readonly groups = computed(() => groupTasks(sortTasks(this.filtered(), this.clock(), this.tab(), this.sort()), this.clock(), this.tab(), (key) => this.groupLabel(key)));
  readonly summary = computed<TaskSummary>(() => {
    const all = this.tasks();
    const clock = this.clock();
    return { total: all.length, active: all.filter((t) => !isDone(t)).length, done: all.filter(isDone).length, overdue: all.filter((t) => isOverdue(t, clock)).length };
  });
  /** The bell: overdue tasks, tasks due today and (when chosen) tasks due in the next three days, unless notifications are off or the task has its reminder off. */
  readonly reminders = computed<TaskReminder[]>(() => {
    const s = this.settings();
    const clock = this.clock();
    if (!s?.notificationsEnabled)
      return [];
    const soon = ymd(addDays(parseYmd(clock.today), 3));
    const out: TaskReminder[] = [];
    for (const t of this.tasks()) {
      if (isDone(t) || !t.remindEnabled || !t.dueDate)
        continue;
      if (isOverdue(t, clock)) {
        if (s.overdueReminders)
          out.push({ task: t, kind: 'od' });
      } else if (t.dueDate === clock.today)
        out.push({ task: t, kind: 'td' });
      else if (s.upcomingReminders && t.dueDate > clock.today && t.dueDate <= soon)
        out.push({ task: t, kind: 'up' });
    }
    return out;
  });

  // #region Public Methods

  selectAll(): void {
    this.selected.set(new Set(this.filtered().map((t) => t.id)));
  }

  /** Clears the date, category and search filters (the tab stays). */
  clearFilters(): void {
    this.scope.set('all');
    this.category.set('all');
    this.query.set('');
  }

  stopSelecting(): void {
    this.selecting.set(false);
    this.selected.set(new Set());
  }

  /** The due date a quick-added task gets: the day the date filter points at (today for Today, Current week and Current month). */
  quickDue(): string | null {
    const s = this.scope();
    const today = this.clock().today;
    if (s === 'today' || s === 'week' || s === 'month')
      return today;
    if (s === 'nextweek')
      return weekRange(this.clock(), 1)[0];
    if (s.startsWith('m:'))
      return s.slice(2) === today.slice(0, 7) ? today : s.slice(2) + '-01';
    if (s.startsWith('y:'))
      return s.slice(2) === today.slice(0, 4) ? today : s.slice(2) + '-01-01';
    return null;
  }

  answer(ok: boolean): void {
    const ask = this.ask();
    this.ask.set(null);
    ask?.resolve(ok);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  pick(task: TaskItem): void {
    this.selected.update((s) => this.flip(s, task.id));
  }

  /** Loads everything the app shows. Called when the app opens and after it is unlocked. */
  async load(): Promise<void> {
    try {
      const [tasks, categories, settings] = await Promise.all([this.api.tasks(), this.api.categories(), this.api.settings()]);
      if (!this.loaded())
        this.tab.set(settings.defaultTab);
      this.tasks.set(tasks);
      this.categories.set(categories);
      this.settings.set(settings);
      void this.syncTimeZone(settings);
      this.loaded.set(true);
      this.failed.set(false);
      this.startClock();
      this.notify();
    } catch (e) {
      if ((e as { status?: number }).status !== 423)
        this.failed.set(true);
    }
  }

  expand(task: TaskItem): void {
    this.expanded.update((s) => this.flip(s, task.id));
  }

  /** The heading of a group in the list. */
  groupLabel(key: string): string {
    if (key.startsWith('m:'))
      return monthLabel(key.slice(2), this.locale());
    if (key.startsWith('c:'))
      return this.i18n.t('tasks.group.completedIn', { month: monthLabel(key.slice(2), this.locale()) });
    return this.i18n.t('tasks.group.' + key);
  }

  /** DD-MM-YYYY, or Today / Tomorrow / Yesterday, plus the time. */
  friendlyDue(task: TaskItem): string {
    if (!task.dueDate)
      return '';
    const today = parseYmd(this.clock().today);
    const time = timeOf(task) ? ' · ' + timeOf(task) : '';
    const near: Record<string, string> = { [ymd(today)]: 'tasks.due.today', [ymd(addDays(today, 1))]: 'tasks.due.tomorrow', [ymd(addDays(today, -1))]: 'tasks.due.yesterday' };
    const key = near[task.dueDate];
    return (key ? this.i18n.t(key) : formatYmd(task.dueDate)) + time;
  }

  photoUrl(attachmentId: number): string {
    return this.api.photoUrl(attachmentId);
  }

  async remove(ids: number[]): Promise<void> {
    try {
      const res = ids.length === 1 ? await this.api.remove(ids[0]) : await this.api.bulk(ids, 'delete', null);
      this.apply(res.data);
      this.stopSelecting();
      this.toast(res.message ?? '', false, () => void this.restoreMany(ids));
    } catch (e) {
      this.fail(e);
    }
  }

  async restore(id: number): Promise<boolean> {
    return this.run(() => this.api.restore(id));
  }

  /** Completes an open task or reopens a completed one. */
  async toggle(task: TaskItem): Promise<boolean> {
    return this.run(() => (isDone(task) ? this.api.reopen(task.id) : this.api.complete(task.id)));
  }

  async duplicate(task: TaskItem): Promise<boolean> {
    return this.run(() => this.api.duplicate(task.id));
  }

  categoryOf(id: number | null): TaskCategory | null {
    return id === null ? null : (this.categories().find((c) => c.id === id) ?? null);
  }

  /** The name of a category in the language of the reader: built-in ones are translated, the others are the user's own text. */
  categoryName(category: TaskCategory | null): string {
    if (!category)
      return this.i18n.t('tasks.cat.none');
    return category.code ? this.i18n.t('tasks.cat.' + category.code) : category.name;
  }

  /** Asks before a change that cannot be undone; resolves true when the user agrees. */
  confirm(text: string, action: string): Promise<boolean> {
    this.ask()?.resolve(false);
    return new Promise((resolve) => this.ask.set({ text, action, resolve }));
  }

  async removePhoto(attachmentId: number): Promise<boolean> {
    return this.run(() => this.api.removePhoto(attachmentId));
  }

  async deleteCategory(category: TaskCategory): Promise<void> {
    try {
      const res = await this.api.deleteCategory(category.id);
      this.categories.update((list) => list.filter((c) => c.id !== category.id));
      this.tasks.update((list) => list.map((t) => (t.categoryId === category.id ? { ...t, categoryId: null } : t)));
      if (this.category() === category.id)
        this.category.set('all');
      this.toast(res.message ?? '');
    } catch (e) {
      this.fail(e);
    }
  }

  async saveSettings(settings: TaskSettings): Promise<boolean> {
    try {
      const res = await this.api.saveSettings(settings);
      this.settings.set({ ...res.data, canRename: settings.canRename });
      this.toast(res.message ?? '');
      return true;
    } catch (e) {
      this.fail(e);
      return false;
    }
  }

  openEditor(task: TaskItem | null, due?: string | null): void {
    this.editor.set({ task, due: due === undefined ? this.quickDue() : due });
  }

  /** Ticks or unticks one checklist line at once on screen, then on the server (the task may complete or reopen by itself). */
  async toggleItem(task: TaskItem, itemId: number): Promise<void> {
    const item = task.checklist.find((c) => c.id === itemId);
    if (!item)
      return;
    this.patch({ ...task, checklist: task.checklist.map((c) => (c.id === itemId ? { ...c, isDone: !c.isDone } : c)) });
    try {
      this.apply(await this.api.toggle(task.id, itemId, !item.isDone));
    } catch (e) {
      this.patch(task);
      this.fail(e);
    }
  }

  toast(text: string, error = false, undo: (() => void) | null = null): void {
    if (!text)
      return;
    const id = ++this.toastId;
    this.toasts.update((list) => [...list, { id, text, error, undo }]);
    setTimeout(() => this.dismiss(id), TOAST_MS);
  }

  async bulk(action: string, categoryId: number | null = null): Promise<void> {
    const ids = [...this.selected()];
    if (!ids.length)
      return;
    if (action === 'delete') {
      await this.remove(ids);
      return;
    }
    if (await this.run(() => this.api.bulk(ids, action, categoryId)))
      this.stopSelecting();
  }

  /** Saves the editor: a new task or the changes of one. Returns the saved task, or null on failure. */
  async save(id: number | null, request: TaskRequest): Promise<TaskItem | null> {
    try {
      const before = new Set(this.tasks().map((t) => t.id));
      const res = id === null ? await this.api.create(request) : await this.api.update(id, request);
      this.apply(res.data);
      const saved = res.data.tasks.find((t) => (id === null ? !before.has(t.id) : t.id === id)) ?? null;
      this.flash.set(saved?.id ?? null);
      this.toast(res.message ?? '');
      return saved;
    } catch (e) {
      this.fail(e);
      return null;
    }
  }

  async upload(taskId: number, files: { file: Blob; name: string }[]): Promise<boolean> {
    return files.length ? this.run(() => this.api.upload(taskId, files)) : true;
  }

  /** How many tasks a tab, date scope or category would show with the other filters as they are. */
  count(tab: TaskTab | null, scope: string | null, category: number | 'all' | null): number {
    return this.tasks().filter((t) => this.passes(t, tab ?? this.tab(), scope ?? this.scope(), category ?? this.category())).length;
  }

  async saveCategory(category: TaskCategory | null, name: string, color: string): Promise<boolean> {
    try {
      const res = category ? await this.api.saveCategory(category.id, name, color) : await this.api.addCategory(name, color);
      this.categories.update((list) => (category ? list.map((c) => (c.id === category.id ? res.data : c)) : [...list, res.data]));
      this.toast(res.message ?? '');
      return true;
    } catch (e) {
      this.fail(e);
      return false;
    }
  }

  // #endregion

  // #region Private Methods

  /**
   * Device notifications while the app is open (or in the background of a phone that keeps it running), once per task and day:
   * a timed task "remind before" its time, an untimed one at the daily reminder time, overdue and upcoming ones at the daily time when switched on.
   * Push notifications while the app is closed need a push service, which this site does not have yet.
   */
  private notify(): void {
    const s = this.settings();
    if (!this.browser || !s?.notificationsEnabled || !('Notification' in window) || Notification.permission !== 'granted')
      return;
    const clock = this.clock();
    const sent = this.readNotified(clock.today);
    const now = this.moment();
    const daily = clock.now >= s.reminderTime;
    for (const r of this.reminders()) {
      const t = r.task;
      const time = timeOf(t);
      const due = r.kind === 'td' && time ? new Date(parseYmd(t.dueDate!).getTime() + (Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) - (BEFORE_MINUTES[s.remindBefore] ?? 0)) * 60000) <= now : daily;
      if (!due || sent.includes(t.id))
        continue;
      sent.push(t.id);
      const body = r.kind === 'od' ? this.i18n.t('tasks.rem.overdue', { date: formatYmd(t.dueDate) }) : this.friendlyDue(t);
      void this.show(t.title, body, t.id);
    }
    try {
      localStorage.setItem(NOTIFIED_KEY, JSON.stringify({ day: clock.today, ids: sent }));
    } catch {
      /* storage may be blocked */
    }
  }

  private startClock(): void {
    if (!this.browser || this.timer)
      return;
    this.timer = setInterval(() => {
      this.moment.set(new Date());
      this.notify();
    }, TICK_MS);
  }

  private fail(e: unknown): void {
    if ((e as { status?: number }).status !== 423)
      this.toast((e as Error).message, true);
  }

  private patch(task: TaskItem): void {
    this.tasks.update((list) => list.map((t) => (t.id === task.id ? task : t)));
  }

  /** Merges what the server changed: removes the deleted tasks and puts in the new or changed ones. */
  private apply(changes: TaskChanges): void {
    const gone = new Set([...changes.deletedIds, ...changes.tasks.map((t) => t.id)]);
    this.tasks.update((list) => [...list.filter((t) => !gone.has(t.id)), ...changes.tasks]);
  }

  private readNotified(today: string): number[] {
    try {
      const saved = JSON.parse(localStorage.getItem(NOTIFIED_KEY) ?? 'null') as { day: string; ids: number[] } | null;
      return saved?.day === today ? saved.ids : [];
    } catch {
      return [];
    }
  }

  private async restoreMany(ids: number[]): Promise<void> {
    for (const id of ids)
      await this.restore(id);
  }

  /** Keeps the time zone of the user in step with the device, so the server sends WhatsApp reminders on the user's own day (no message is shown). */
  private async syncTimeZone(settings: TaskSettings): Promise<void> {
    const zone = this.browser ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';
    if (!zone || zone === settings.timeZone)
      return;
    try {
      const res = await this.api.saveSettings({ ...settings, timeZone: zone });
      this.settings.set({ ...res.data, canRename: settings.canRename });
    } catch {
      /* the server may not know the zone; the saved one stays */
    }
  }

  private flip(set: ReadonlySet<number>, id: number): ReadonlySet<number> {
    const next = new Set(set);
    if (!next.delete(id))
      next.add(id);
    return next;
  }

  private async show(title: string, body: string, tag: number): Promise<void> {
    const options = { body, tag: 'task-' + tag, icon: 'icons/tasks-192.png' };
    const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (registration)
      await registration.showNotification(title, options);
    else
      new Notification(title, options);
  }

  private passes(task: TaskItem, tab: TaskTab, scope: string, category: number | 'all'): boolean {
    return inTab(task, tab) && inScope(task, scope, this.clock()) && (category === 'all' || task.categoryId === category) && matches(task, this.query(), this.categoryName(this.categoryOf(task.categoryId)));
  }

  private async run(call: () => Promise<{ data: TaskChanges; message: string | null }>): Promise<boolean> {
    try {
      const res = await call();
      this.apply(res.data);
      this.toast(res.message ?? '');
      return true;
    } catch (e) {
      this.fail(e);
      return false;
    }
  }

  // #endregion
}
