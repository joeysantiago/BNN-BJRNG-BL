import { sha256 } from './demo-hash';
import { DemoFailure } from './demo-failure';
import { APP_SETTINGS } from '../../appSettings';
import { TASKS_DEMO_MESSAGES } from './tasks-demo-messages';
import { DemoDb, DemoSession, DemoUser } from './demo.model';
import { TaskCategory, TaskChanges, TaskHistoryEntry, TaskItem, TaskLimits, TaskPinStatus, TaskRepeat, TaskSettings } from '../models/tasks.model';
import { TasksDemoCategory, TasksDemoDb, TasksDemoHistory, TasksDemoLine, TasksDemoResult, TasksDemoTask, TasksDemoUser } from './tasks-demo.model';

export { TASKS_DEMO_MESSAGES };

/** Tasks.* rows of the AppSettings table (INSERT/Common/002_AppSettings.sql). */
const LIMITS: TaskLimits = { photoEdgePx: 1600, maxBulkTasks: 200, maxCategories: 30, maxPhotoBytes: 3145728, maxPickedBytes: 15728640, maxPhotosPerTask: 8, maxChecklistItems: 100 };
/** How much of this browser's storage the pictures of My Tasks and SnapKhata may take together (the demo's own limit). */
const FILE_SPACE = 3500000;
/** The same values as Tasks:Pin in appsettings.json of the API. */
const PIN = { length: 4, maxAttempts: 5, lockMinutes: 15, maxFailures: 10, resetMinutes: 10, renewSeconds: 60 };
/** The same values as Tasks:NewUser in appsettings.json of the API: the settings and categories a new My Tasks profile starts with. */
const NEW_USER = { lockAfterMinutes: 5, notificationsEnabled: true, reminderTime: '09:00', remindBefore: '1d', overdueReminders: true, upcomingReminders: true, weekStart: 'mon', defaultTab: 'active', defaultPriority: 2, defaultCategoryCode: 'personal', whatsAppReminders: false, timeZone: 'Asia/Kolkata' } as const;
const NEW_CATEGORIES = [
  { code: 'marketing', name: 'Marketing', color: '#d6489a', isSystem: true },
  { code: 'personal', name: 'Personal', color: '#3a66f5', isSystem: false },
  { code: 'home', name: 'Home', color: '#1f9d63', isSystem: false },
  { code: 'maintenance', name: 'Maintenance', color: '#f5a524', isSystem: false },
  { code: 'work', name: 'Work', color: '#8b5cf6', isSystem: false },
];
/** A few tasks a new profile of the demo starts with, so the first visit is not empty: [title, category code, due in days (null = none), time, priority, repeat, checklist, done]. */
const SAMPLES: [string, string, number | null, string | null, number, TaskRepeat, string[], boolean][] = [
  ['Visit Sharma Electronics', 'marketing', 0, '11:00:00', 3, 'weekly', ['Show the new catalogue', 'Collect the order'], false],
  ['Pay the electricity bill', 'home', -1, null, 3, 'monthly', [], false],
  ['Service the water purifier', 'maintenance', 3, '10:30:00', 2, 'none', [], false],
  ['Plan the weekend trip', 'personal', null, null, 1, 'none', ['Book the tickets', 'Pack the bags'], false],
  ['Send the weekly report', 'work', -2, '17:00:00', 2, 'none', [], true],
];
const TITLE_LENGTH = 120;
const ITEM_LENGTH = 200;
const NAME_LENGTH = 40;
const FILE_NAME_LENGTH = 120;
const DESCRIPTION_LENGTH = 2000;
const TABS = ['all', 'active', 'completed'];
const WEEK_STARTS = ['mon', 'sun'];
const LOCK_MINUTES = [0, 1, 5, 15, 30];
const REMIND_BEFORES = ['0', '15m', '1h', '1d'];
const UNITS = ['day', 'week', 'month', 'year'];
const REPEATS: TaskRepeat[] = ['none', 'daily', 'weekly', 'monthly', 'yearly', 'custom'];
const BULK = ['delete', 'reopen', 'category', 'complete', 'duplicate'];
const COLOR = /^#[0-9a-fA-F]{6}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}(:\d{2})?$/;
/** The calls that work while the App Lock is locked (TasksLockFree in the API). */
const LOCK_FREE = ['GET /tasks/pin', 'POST /tasks/pin/lock', 'PUT /tasks/pin', 'POST /tasks/pin/verify'];

/** What one call changes: new tasks (made, duplicated, repeated), changed and deleted ones, and the history lines (TaskWork of the API). */
class TasksDemoWork {
  readonly deletedIds: number[] = [];
  readonly added: TasksDemoTask[] = [];
  readonly changed: TasksDemoTask[] = [];
  readonly history: Omit<TasksDemoHistory, 'at'>[] = [];

  // #region Public Methods

  log(task: TasksDemoTask, action: string, detail: string | null = null): void {
    this.history.push({ taskId: task.id, action, detail });
  }

  // #endregion
}

/**
 * The API of My Tasks (TasksController, TaskCategoriesController, TaskSettingsController, TaskPinController, TaskAttachmentsController and TaskAccountController)
 * inside the browser, for the Angular-only Mojito demo. It follows the rules of the API's Task services and answers with the same codes. Its data is part of the
 * demo database (DemoDb.tasks), so it is kept in this browser's storage with the rest. Loaded with the first My Tasks call only. WhatsApp needs the API; the demo says so.
 */
export class TasksDemo {
  private readonly t: TasksDemoDb;

  constructor(private readonly db: DemoDb, private readonly user: DemoUser, private readonly session: DemoSession, private readonly next: () => number, private readonly save: () => void) {
    db.tasks ??= { files: [], tasks: [], users: {}, locks: {}, history: [], categories: [] };
    this.t = db.tasks;
  }

  // #region Public Methods

  async route(method: string, path: string, body: unknown, isSuper: boolean): Promise<TasksDemoResult> {
    const ids = [...path.matchAll(/\/(\d+)(?=\/|$)/g)].map((m) => Number(m[1]));
    const form = (body ?? {}) as Record<string, unknown>;
    const me = this.profile();
    if (!LOCK_FREE.includes(`${method} ${path}`))
      this.ensureUnlocked(me);
    switch (`${method} ${path.replace(/\/\d+(?=\/|$)/g, '/{id}')}`) {
      case 'GET /tasks/items':
        return { data: this.mine(false).sort((a, b) => a.id - b.id).map((x) => this.dto(x)) };
      case 'GET /tasks/items/deleted':
        return { data: this.mine(true).sort((a, b) => (b.deletedOn ?? '').localeCompare(a.deletedOn ?? '')).map((x) => this.dto(x)) };
      case 'POST /tasks/items':
        return this.create(form);
      case 'POST /tasks/items/bulk':
        return this.bulk(form);
      case 'PUT /tasks/items/{id}':
        return this.update(ids[0], form);
      case 'DELETE /tasks/items/{id}':
        return this.change(ids[0], 'TASKS_DELETED', (task, work) => this.softDelete(task, work));
      case 'POST /tasks/items/{id}/reopen':
        return this.change(ids[0], 'TASKS_REOPENED', (task, work) => this.reopen(task, false, work));
      case 'POST /tasks/items/{id}/complete':
        return this.change(ids[0], 'TASKS_COMPLETED', (task, work) => this.complete(task, false, work));
      case 'POST /tasks/items/{id}/duplicate':
        return this.change(ids[0], 'TASKS_DUPLICATED', (task, work) => this.duplicate(task, work));
      case 'POST /tasks/items/{id}/restore':
        return this.restore(ids[0]);
      case 'GET /tasks/items/{id}/history':
        return { data: this.historyOf(ids[0]) };
      case 'PUT /tasks/items/{id}/checklist/{id}':
        return { data: this.toggle(ids[0], ids[1], form['isDone'] === true) };
      case 'POST /tasks/items/{id}/attachments':
        return this.upload(ids[0], body);
      case 'DELETE /tasks/attachments/{id}':
        return this.removePhoto(ids[0]);
      case 'GET /tasks/categories':
        return { data: this.categories().map((c) => this.categoryDto(c)) };
      case 'POST /tasks/categories':
        return this.addCategory(form);
      case 'PUT /tasks/categories/{id}':
        return this.saveCategory(ids[0], form);
      case 'DELETE /tasks/categories/{id}':
        return this.deleteCategory(ids[0], me);
      case 'GET /tasks/settings':
        return { data: this.settingsDto(me, isSuper) };
      case 'PUT /tasks/settings':
        return this.saveSettings(me, form, isSuper);
      case 'POST /tasks/settings/whatsapp-test':
        if (!this.user.details?.mobile)
          throw new DemoFailure(400, 'TASKS_WA_NO_MOBILE');
        throw new DemoFailure(501, 'TASKS_DEMO_WHATSAPP');
      case 'GET /tasks/pin':
      case 'POST /tasks/pin/keep':
        return { data: this.pinStatus(me) };
      case 'POST /tasks/pin/lock':
        this.t.locks[this.session.token] = null;
        return { data: this.pinStatus(me) };
      case 'PUT /tasks/pin':
        return this.setPin(me, form);
      case 'POST /tasks/pin/verify':
        if (!me.pinHash)
          throw new DemoFailure(400, 'TASKS_PIN_NOT_SET');
        this.checkPin(me, String(form['pin'] ?? ''));
        this.setLock(me, true);
        return { data: this.pinStatus(me) };
      case 'POST /tasks/pin/remove':
        return this.removePin(me, form);
      case 'DELETE /tasks/me':
        return this.deleteAccount();
      default:
        throw new DemoFailure(404, 'UNEXPECTED_ERROR');
    }
  }

  // #endregion

  // #region Private Methods

  private now(): string {
    return new Date().toISOString();
  }

  /** Today in the local calendar of the visitor, YYYY-MM-DD. */
  private today(): string {
    return this.ymd(new Date());
  }

  /** A login younger than resetMinutes proves the password again, so the PIN may be replaced or removed without the old one. */
  private fresh(): boolean {
    return !!this.session.loggedInOn && this.session.loggedInOn > Date.now() - PIN.resetMinutes * 60000;
  }

  private ymd(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** The My Tasks profile of the caller; the first call makes it with the settings and categories of Tasks:NewUser (and, in the demo, a few sample tasks). */
  private profile(): TasksDemoUser {
    const found = this.t.users[this.user.id];
    if (found)
      return found;
    const categories = NEW_CATEGORIES.map((c, i): TasksDemoCategory => ({ ...c, id: this.next(), ownerId: this.user.id, sortOrder: i }));
    this.t.categories.push(...categories);
    const { defaultCategoryCode, ...settings } = NEW_USER;
    const user: TasksDemoUser = { ...settings, pinFailed: 0, pinHash: null, pinLockedUntil: null, defaultCategoryId: categories.find((c) => c.code === defaultCategoryCode)?.id ?? null };
    this.t.users[this.user.id] = user;
    this.addSamples(categories);
    return user;
  }

  private hash(pin: string): string {
    return sha256(`tasks:${this.user.id}:${pin.trim()}`);
  }

  /** Every digit the same (1111) or one straight run up or down (1234, 9876). */
  private weakPin(pin: string): boolean {
    const steps = new Set([...pin].slice(1).map((d, i) => Number(d) - Number(pin[i])));
    const [only] = [...steps];
    return steps.size === 1 && Math.abs(only) <= 1;
  }

  private task(id: number): TasksDemoTask {
    const found = this.mine(false).find((x) => x.id === id);
    if (!found)
      throw new DemoFailure(404, 'TASKS_NOT_FOUND');
    return found;
  }

  /** "Delete my account" of My Tasks: every task, picture and setting of the caller in this app, and their access to it. The common account and the other apps stay. */
  private deleteAccount(): TasksDemoResult {
    const tasks = this.t.tasks.filter((x) => x.ownerId === this.user.id);
    const photos = new Set(tasks.flatMap((x) => x.photos.map((p) => p.id)));
    const ids = new Set(tasks.map((x) => x.id));
    const tokens = this.db.sessions.filter((s) => s.userId === this.user.id).map((s) => s.token);
    this.t.files = this.t.files.filter((f) => !photos.has(f.id));
    this.t.history = this.t.history.filter((h) => !ids.has(h.taskId));
    this.t.tasks = this.t.tasks.filter((x) => x.ownerId !== this.user.id);
    this.t.categories = this.t.categories.filter((c) => c.ownerId !== this.user.id);
    tokens.forEach((token) => delete this.t.locks[token]);
    delete this.t.users[this.user.id];
    this.user.apps = this.user.apps.filter((a) => a !== 'tasks');
    return { code: 'TASKS_ACCOUNT_DELETED' };
  }

  /** Pictures share this browser's storage with everything else (SnapKhata's photos too): past FILE_SPACE, the demo asks to remove some first. */
  private checkSpace(adding: number): void {
    const used = [...this.t.files, ...(this.db.khata?.files ?? [])].reduce((s, f) => s + f.data.length, 0);
    if (used + adding > FILE_SPACE)
      throw new DemoFailure(507, 'TASKS_DEMO_FULL');
  }

  private validZone(zone: string): boolean {
    try {
      new Intl.DateTimeFormat('en', { timeZone: zone });
      return !!zone;
    } catch {
      return false;
    }
  }

  private categories(): TasksDemoCategory[] {
    return this.t.categories.filter((c) => c.ownerId === this.user.id && !c.deleted).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  }

  /** TaskDto of the API. Removed checklist lines and pictures are left out. */
  private dto(task: TasksDemoTask): TaskItem {
    return {
      id: task.id,
      title: task.title,
      priority: task.priority,
      createdOn: task.createdOn,
      isStarted: task.isStarted,
      repeatUnit: task.repeatUnit,
      repeatEvery: task.repeatEvery,
      dueDate: task.dueDate,
      dueTime: task.dueTime,
      remindEnabled: task.remindEnabled,
      repeatType: task.repeatType,
      deletedOn: task.deletedOn,
      categoryId: task.categoryId,
      modifiedOn: task.modifiedOn,
      completedOn: task.completedOn,
      description: task.description,
      attachments: this.live(task.photos).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id).map((p) => ({ id: p.id, fileName: p.fileName, sizeBytes: p.sizeBytes, contentType: p.contentType })),
      checklist: this.live(task.lines).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id).map((c) => ({ id: c.id, text: c.text, isDone: c.isDone, doneOn: c.doneOn })),
    };
  }

  /** One interval after the due date (or today); a month or year later keeps the day where the month has it (31 January + 1 month = 28 February). */
  private nextDue(task: TasksDemoTask): string {
    const [y, m, d] = (task.dueDate ?? this.today()).split('-').map(Number);
    const every = Math.max(1, task.repeatEvery);
    const units: Record<string, string> = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' };
    const unit = units[task.repeatType] ?? task.repeatUnit;
    if (unit === 'day' || unit === 'week')
      return this.ymd(new Date(y, m - 1, d + (unit === 'week' ? 7 : 1) * every));
    const months = (unit === 'month' ? 1 : 12) * every;
    const last = new Date(y, m - 1 + months + 1, 0).getDate();
    return this.ymd(new Date(y, m - 1 + months, Math.min(d, last)));
  }

  private restore(id: number): TasksDemoResult {
    const task = this.mine(true).find((x) => x.id === id);
    if (!task)
      throw new DemoFailure(404, 'TASKS_NOT_FOUND');
    const work = new TasksDemoWork();
    task.deleted = false;
    task.deletedOn = null;
    this.touch(task, work);
    work.log(task, 'restored');
    return { code: 'TASKS_RESTORED', data: this.finish(work) };
  }

  private openMinutes(me: TasksDemoUser): number {
    return Math.max(1, me.lockAfterMinutes);
  }

  private mine(deleted: boolean): TasksDemoTask[] {
    return this.t.tasks.filter((x) => x.ownerId === this.user.id && !!x.deleted === deleted);
  }

  private category(id: number): TasksDemoCategory {
    const found = this.categories().find((c) => c.id === id);
    if (!found)
      throw new DemoFailure(404, 'TASKS_CATEGORY_NOT_FOUND');
    return found;
  }

  /** While a PIN is set, every call of this login session is refused with 423 until the PIN is entered; it stays open lockAfterMinutes after the last call. */
  private ensureUnlocked(me: TasksDemoUser): void {
    if (!me.pinHash)
      return;
    const until = this.t.locks[this.session.token];
    if (!until || until <= Date.now())
      throw new DemoFailure(423, 'TASKS_PIN_REQUIRED');
    const next = Date.now() + this.openMinutes(me) * 60000;
    if (next - until >= PIN.renewSeconds * 1000)
      this.t.locks[this.session.token] = next;
  }

  /** Writes the history of a change and answers with its tasks (TaskWork.ToDto). */
  private finish(work: TasksDemoWork): TaskChanges {
    const at = this.now();
    this.t.history.push(...work.history.map((h) => ({ ...h, at })));
    const tasks = [...new Set([...work.changed, ...work.added])].filter((x) => !work.deletedIds.includes(x.id));
    return { tasks: tasks.map((x) => this.dto(x)), deletedIds: work.deletedIds };
  }

  private removePhoto(id: number): TasksDemoResult {
    const task = this.mine(false).find((x) => this.live(x.photos).some((p) => p.id === id));
    if (!task)
      throw new DemoFailure(404, 'TASKS_PHOTO_NOT_FOUND');
    task.photos.find((p) => p.id === id)!.deleted = true;
    this.t.files = this.t.files.filter((f) => f.id !== id);
    task.modifiedOn = this.now();
    return { code: 'TASKS_PHOTO_REMOVED', data: { tasks: [this.dto(task)], deletedIds: [] } };
  }

  private historyOf(id: number): TaskHistoryEntry[] {
    if (!this.t.tasks.some((x) => x.id === id && x.ownerId === this.user.id))
      return [];
    return this.t.history.filter((h) => h.taskId === id).reverse().map((h) => ({ at: h.at, action: h.action, detail: h.detail }));
  }

  /** GET /tasks/pin, as TaskPinStatusDto. */
  private pinStatus(me: TasksDemoUser): TaskPinStatus {
    const until = this.t.locks[this.session.token];
    const lockedUntil = me.pinLockedUntil && me.pinLockedUntil > Date.now() ? new Date(me.pinLockedUntil).toISOString() : null;
    return { length: PIN.length, hasPin: !!me.pinHash, locked: !!me.pinHash && !(until && until > Date.now()), canReset: this.fresh(), lockAfterMinutes: me.lockAfterMinutes, lockedUntil };
  }

  /** The checks of TaskService.ValidateAsync, in the same order. */
  private validate(form: Record<string, unknown>): void {
    const title = String(form['title'] ?? '').trim();
    if (!title)
      throw new DemoFailure(400, 'TASKS_TITLE_REQUIRED');
    const checklist = this.lines(form);
    if (checklist.length > LIMITS.maxChecklistItems)
      throw new DemoFailure(400, 'TASKS_CHECKLIST_LIMIT', [LIMITS.maxChecklistItems]);
    const repeat = String(form['repeatType'] ?? '') as TaskRepeat;
    const every = Number(form['repeatEvery']);
    const priority = Number(form['priority']);
    const due = form['dueDate'];
    const time = form['dueTime'];
    const custom = repeat === 'custom' ? Number.isInteger(every) && every >= 1 && every <= 99 && UNITS.includes(String(form['repeatUnit'] ?? '')) : true;
    const dates = (due == null || DAY.test(String(due))) && (time == null || TIME.test(String(time)));
    const valid = title.length <= TITLE_LENGTH && String(form['description'] ?? '').trim().length <= DESCRIPTION_LENGTH && [1, 2, 3].includes(priority) && REPEATS.includes(repeat) && custom && dates;
    if (!valid || checklist.some((c) => !String(c['text'] ?? '').trim() || String(c['text']).trim().length > ITEM_LENGTH))
      throw new DemoFailure(400, 'TASKS_INVALID');
    if (form['categoryId'] != null)
      this.category(Number(form['categoryId']));
  }

  /**
   * A right PIN clears the wrong tries. Every maxAttempts wrong tries in a row lock it for lockMinutes; maxFailures in all clear it and end every
   * session of the account (401). Wrong tries are saved before the refusal, as the demo saves only answered calls.
   */
  private checkPin(me: TasksDemoUser, pin: string): void {
    if (me.pinLockedUntil && me.pinLockedUntil > Date.now())
      throw new DemoFailure(429, 'TASKS_PIN_LOCKED', [Math.ceil((me.pinLockedUntil - Date.now()) / 60000)]);
    if (me.pinHash === this.hash(pin)) {
      me.pinFailed = 0;
      return;
    }
    me.pinFailed++;
    if (me.pinFailed >= PIN.maxFailures) {
      me.pinHash = null;
      me.pinFailed = 0;
      me.pinLockedUntil = null;
      this.db.sessions = this.db.sessions.filter((s) => s.userId !== this.user.id);
      this.save();
      throw new DemoFailure(401, 'TASKS_PIN_CLEARED');
    }
    if (me.pinFailed % PIN.maxAttempts === 0) {
      me.pinLockedUntil = Date.now() + PIN.lockMinutes * 60000;
      this.save();
      throw new DemoFailure(429, 'TASKS_PIN_LOCKED', [PIN.lockMinutes]);
    }
    this.save();
    throw new DemoFailure(400, 'TASKS_PIN_WRONG', [PIN.maxAttempts - (me.pinFailed % PIN.maxAttempts)]);
  }

  private categoryDto(c: TasksDemoCategory): TaskCategory {
    return { id: c.id, name: c.name, color: c.color, isSystem: c.isSystem, taskCount: this.mine(false).filter((x) => x.categoryId === c.id).length, code: c.code };
  }

  private addSamples(categories: TasksDemoCategory[]): void {
    const now = this.now();
    for (const [title, code, days, time, priority, repeatType, lines, done] of SAMPLES) {
      const due = days === null ? null : this.ymd(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + days));
      const task: TasksDemoTask = { id: this.next(), title, ownerId: this.user.id, priority, createdOn: now, isStarted: false, repeatUnit: '', repeatEvery: 1, dueDate: due, dueTime: due ? time : null, remindEnabled: due !== null, repeatSpawned: false, repeatType, lines: [], deletedOn: null, categoryId: categories.find((c) => c.code === code)?.id ?? null, modifiedOn: null, photos: [], completedOn: done ? now : null, description: null };
      task.lines = lines.map((text, i) => ({ id: this.next(), text, isDone: false, sortOrder: i, doneOn: null }));
      this.t.tasks.push(task);
      this.t.history.push({ at: now, taskId: task.id, action: 'created', detail: null });
    }
  }

  /** The due time as HH:mm:ss (the API's TimeOnly), or null without a due date. */
  private time(form: Record<string, unknown>): string | null {
    const time = form['dueTime'] == null ? null : String(form['dueTime']);
    return form['dueDate'] == null || !time ? null : time.length === 5 ? time + ':00' : time;
  }

  /** The type of a picture, read from its first bytes (the file name is not trusted): JPEG, PNG, GIF or WebP (TaskImageType of the API). */
  private async imageType(file: Blob): Promise<string | null> {
    const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)
      return 'image/jpeg';
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
      return 'image/png';
    if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38)
      return 'image/gif';
    const riff = b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46;
    return riff && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 ? 'image/webp' : null;
  }

  private setLock(me: TasksDemoUser, unlocked: boolean): void {
    this.t.locks[this.session.token] = unlocked ? Date.now() + this.openMinutes(me) * 60000 : null;
  }

  private bulk(form: Record<string, unknown>): TasksDemoResult {
    const ids = [...new Set((Array.isArray(form['ids']) ? form['ids'] : []).map(Number))];
    const action = String(form['action'] ?? '');
    const categoryId = form['categoryId'] == null ? null : Number(form['categoryId']);
    if (!ids.length || ids.length > LIMITS.maxBulkTasks || !BULK.includes(action))
      throw new DemoFailure(400, 'TASKS_INVALID');
    if (action === 'category' && categoryId !== null)
      this.category(categoryId);
    const tasks = this.mine(false).filter((x) => ids.includes(x.id));
    const work = new TasksDemoWork();
    for (const task of tasks)
      this.bulkOne(task, action, categoryId, work);
    return { code: 'TASKS_BULK_DONE', args: [tasks.length], data: this.finish(work) };
  }

  private live<T extends { deleted?: boolean }>(rows: T[]): T[] {
    return rows.filter((r) => !r.deleted);
  }

  private touch(task: TasksDemoTask, work: TasksDemoWork): void {
    task.modifiedOn = this.now();
    if (!work.changed.includes(task))
      work.changed.push(task);
  }

  private create(form: Record<string, unknown>): TasksDemoResult {
    this.validate(form);
    const work = new TasksDemoWork();
    const task: TasksDemoTask = { id: this.next(), title: '', ownerId: this.user.id, priority: 2, createdOn: this.now(), isStarted: false, repeatUnit: '', repeatEvery: 1, dueDate: null, dueTime: null, remindEnabled: false, repeatSpawned: false, repeatType: 'none', lines: [], deletedOn: null, categoryId: null, modifiedOn: null, photos: [], completedOn: null, description: null };
    this.apply(task, form);
    this.t.tasks.push(task);
    work.added.push(task);
    work.log(task, 'created');
    this.sync(task, false, work);
    return { code: 'TASKS_ADDED', data: this.finish(work) };
  }

  /** The file as a data: URL of the given type, so it can live in this browser's storage. */
  private async dataUrl(file: Blob, type: string): Promise<string> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
    return `data:${type};base64,${btoa(binary)}`;
  }

  /** A copy keeps the checklist (unticked) and the pictures (each one copied, so removing one never removes the other). */
  private duplicate(task: TasksDemoTask, work: TasksDemoWork): void {
    const photos = this.live(task.photos);
    const files = photos.map((p) => this.t.files.find((f) => f.id === p.id)?.data ?? '');
    this.checkSpace(files.reduce((s, f) => s + f.length, 0));
    const copy = this.copy(task, task.dueDate);
    photos.forEach((p, i) => {
      const id = this.next();
      copy.photos.push({ ...p, id });
      this.t.files.push({ id, data: files[i] });
    });
    work.added.push(copy);
    work.log(copy, 'duplicated', task.title);
  }

  private softDelete(task: TasksDemoTask, work: TasksDemoWork): void {
    task.deleted = true;
    task.deletedOn = this.now();
    this.touch(task, work);
    work.deletedIds.push(task.id);
    work.log(task, 'deleted');
  }

  private addCategory(form: Record<string, unknown>): TasksDemoResult {
    const { name, color } = this.checkCategory(form);
    const count = this.categories().length;
    if (count >= LIMITS.maxCategories)
      throw new DemoFailure(400, 'TASKS_CATEGORY_LIMIT', [LIMITS.maxCategories]);
    const category: TasksDemoCategory = { id: this.next(), name, color, ownerId: this.user.id, isSystem: false, sortOrder: count, code: null };
    this.t.categories.push(category);
    return { code: 'TASKS_CATEGORY_SAVED', data: this.categoryDto(category) };
  }

  /** Marketing cannot be deleted; deleting another category leaves its tasks without one. */
  private deleteCategory(id: number, me: TasksDemoUser): TasksDemoResult {
    const category = this.category(id);
    if (category.isSystem)
      throw new DemoFailure(400, 'TASKS_CATEGORY_SYSTEM');
    category.deleted = true;
    if (me.defaultCategoryId === id)
      me.defaultCategoryId = null;
    for (const task of this.t.tasks.filter((x) => x.ownerId === this.user.id && x.categoryId === id)) {
      task.categoryId = null;
      task.modifiedOn = this.now();
    }
    return { code: 'TASKS_CATEGORY_DELETED', data: id };
  }

  private settingsDto(me: TasksDemoUser, isSuper: boolean): TaskSettings {
    const { pinHash, pinFailed, pinLockedUntil, ...settings } = me;
    return { ...settings, limits: LIMITS, mobile: this.user.details?.mobile ?? null };
  }

  private lines(form: Record<string, unknown>): Record<string, unknown>[] {
    return Array.isArray(form['checklist']) ? (form['checklist'] as Record<string, unknown>[]) : [];
  }

  /** A new task with the fields and checklist (unticked) of another one. */
  private copy(task: TasksDemoTask, dueDate: string | null): TasksDemoTask {
    const lines = this.live(task.lines).sort((a, b) => a.sortOrder - b.sortOrder).map((c, i): TasksDemoLine => ({ id: this.next(), text: c.text, isDone: false, sortOrder: i, doneOn: null }));
    const copy: TasksDemoTask = { ...task, id: this.next(), deleted: false, dueDate, dueTime: dueDate ? task.dueTime : null, isStarted: false, repeatSpawned: false, lines, photos: [], createdOn: this.now(), modifiedOn: null, completedOn: null, deletedOn: null };
    this.t.tasks.push(copy);
    return copy;
  }

  private toggle(id: number, itemId: number, isDone: boolean): TaskChanges {
    const task = this.task(id);
    const line = this.live(task.lines).find((c) => c.id === itemId);
    if (!line)
      throw new DemoFailure(404, 'TASKS_NOT_FOUND');
    const work = new TasksDemoWork();
    this.touch(task, work);
    if (line.isDone !== isDone) {
      line.isDone = isDone;
      line.doneOn = isDone ? this.now() : null;
      this.sync(task, !isDone, work);
    }
    return this.finish(work);
  }

  /** At most maxPhotosPerTask pictures, each at most maxPhotoBytes and really a JPG, PNG, GIF or WebP picture. */
  private async upload(id: number, body: unknown): Promise<TasksDemoResult> {
    const task = this.task(id);
    const files = body instanceof FormData ? body.getAll('files').filter((f): f is File => f instanceof File) : [];
    const count = this.live(task.photos).length;
    const megabytes = Math.max(1, Math.floor(LIMITS.maxPhotoBytes / 1048576));
    if (!files.length || count + files.length > LIMITS.maxPhotosPerTask)
      throw new DemoFailure(400, 'TASKS_PHOTO_LIMIT', [LIMITS.maxPhotosPerTask]);
    const pictures: { name: string; type: string; size: number; data: string }[] = [];
    for (const file of files) {
      const type = file.size > 0 && file.size <= LIMITS.maxPhotoBytes ? await this.imageType(file) : null;
      if (!type)
        throw new DemoFailure(400, 'TASKS_PHOTO_INVALID', [megabytes]);
      pictures.push({ name: file.name.replace(/[\\/:*?"<>|]/g, '').trim().slice(0, FILE_NAME_LENGTH), type, size: file.size, data: await this.dataUrl(file, type) });
    }
    this.checkSpace(pictures.reduce((s, p) => s + p.data.length, 0));
    pictures.forEach((p, i) => {
      const photoId = this.next();
      task.photos.push({ id: photoId, fileName: p.name, sizeBytes: p.size, sortOrder: count + i, contentType: p.type });
      this.t.files.push({ id: photoId, data: p.data });
    });
    task.modifiedOn = this.now();
    this.t.history.push({ at: this.now(), taskId: task.id, action: 'edited', detail: 'attachments' });
    return { code: 'TASKS_PHOTO_ADDED', data: { tasks: [this.dto(task)], deletedIds: [] } };
  }

  private update(id: number, form: Record<string, unknown>): TasksDemoResult {
    const task = this.task(id);
    this.validate(form);
    const work = new TasksDemoWork();
    const changed = this.changes(task, form);
    const unticked = this.apply(task, form);
    this.touch(task, work);
    if (changed.length)
      work.log(task, 'edited', changed.join(','));
    this.sync(task, unticked, work);
    return { code: 'TASKS_SAVED', data: this.finish(work) };
  }

  /** The fields of the request onto the task. The checklist follows the request: known lines are updated, new ones added, missing ones removed. True when a ticked line was unticked. */
  private apply(task: TasksDemoTask, form: Record<string, unknown>): boolean {
    const now = this.now();
    const custom = form['repeatType'] === 'custom';
    const description = String(form['description'] ?? '').trim();
    task.title = String(form['title']).trim();
    task.description = description || null;
    task.dueDate = form['dueDate'] == null ? null : String(form['dueDate']);
    task.dueTime = this.time(form);
    task.priority = Number(form['priority']);
    task.categoryId = form['categoryId'] == null ? null : Number(form['categoryId']);
    task.isStarted = form['isStarted'] === true;
    task.remindEnabled = form['remindEnabled'] === true;
    task.repeatType = String(form['repeatType']) as TaskRepeat;
    task.repeatEvery = custom ? Number(form['repeatEvery']) : 1;
    task.repeatUnit = custom ? String(form['repeatUnit']) : '';
    const asked = this.lines(form);
    const lines = this.live(task.lines);
    let unticked = false;
    asked.forEach((a, order) => {
      const isDone = a['isDone'] === true;
      const line = a['id'] == null ? undefined : lines.find((c) => c.id === Number(a['id']));
      if (!line) {
        task.lines.push({ id: this.next(), text: String(a['text']).trim(), isDone, sortOrder: order, doneOn: isDone ? now : null });
        return;
      }
      unticked ||= line.isDone && !isDone;
      line.doneOn = isDone ? line.doneOn ?? now : null;
      line.isDone = isDone;
      line.text = String(a['text']).trim();
      line.sortOrder = order;
    });
    for (const gone of lines.filter((c) => !asked.some((a) => a['id'] != null && Number(a['id']) === c.id)))
      gone.deleted = true;
    return unticked;
  }

  private reopen(task: TasksDemoTask, auto: boolean, work: TasksDemoWork): void {
    if (!task.completedOn)
      return;
    task.completedOn = null;
    this.touch(task, work);
    work.log(task, auto ? 'auto-reopened' : 'reopened');
  }

  /** The fields that a save changes, for the history ("title,due,checklist"). */
  private changes(task: TasksDemoTask, form: Record<string, unknown>): string[] {
    const lines = this.live(task.lines).sort((a, b) => a.sortOrder - b.sortOrder).map((c) => `${c.id}|${c.text}|${c.isDone}`).join('\n');
    const asked = this.lines(form).map((c) => `${Number(c['id'] ?? 0)}|${String(c['text'] ?? '').trim()}|${c['isDone'] === true}`).join('\n');
    const repeat = `${task.repeatType}|${task.repeatEvery}|${task.repeatUnit}` !== `${form['repeatType']}|${form['repeatEvery']}|${form['repeatUnit']}`;
    const checks: [boolean, string][] = [
      [task.title !== String(form['title'] ?? '').trim(), 'title'],
      [(task.description ?? '') !== String(form['description'] ?? '').trim(), 'description'],
      [task.dueDate !== (form['dueDate'] ?? null) || task.dueTime !== this.time(form), 'due'],
      [task.categoryId !== (form['categoryId'] ?? null), 'category'],
      [task.priority !== Number(form['priority']), 'priority'],
      [task.isStarted !== (form['isStarted'] === true), 'status'],
      [task.remindEnabled !== (form['remindEnabled'] === true), 'reminder'],
      [repeat, 'repeat'],
      [lines !== asked, 'checklist'],
    ];
    return checks.filter(([changed]) => changed).map(([, field]) => field);
  }

  /** Completing a repeating task makes its next one once (due one interval later, checklist unticked, no pictures). */
  private complete(task: TasksDemoTask, auto: boolean, work: TasksDemoWork): void {
    if (task.completedOn)
      return;
    task.completedOn = this.now();
    this.touch(task, work);
    work.log(task, auto ? 'auto-completed' : 'completed');
    if (task.repeatType === 'none' || task.repeatSpawned)
      return;
    task.repeatSpawned = true;
    const next = this.copy(task, this.nextDue(task));
    work.added.push(next);
    work.log(next, 'repeated', task.title);
  }

  /** When every checklist line is ticked the task completes by itself; unticking a line of a completed task reopens it. */
  private sync(task: TasksDemoTask, unticked: boolean, work: TasksDemoWork): void {
    const lines = this.live(task.lines);
    if (!lines.length)
      return;
    if (lines.every((c) => c.isDone))
      this.complete(task, true, work);
    else if (unticked)
      this.reopen(task, true, work);
  }

  /** Marketing keeps its name; a renamed built-in category loses its code, so the app shows the new name instead of the translated one. */
  private saveCategory(id: number, form: Record<string, unknown>): TasksDemoResult {
    const { name, color } = this.checkCategory(form);
    const category = this.category(id);
    if (category.isSystem && name !== category.name)
      throw new DemoFailure(400, 'TASKS_CATEGORY_SYSTEM');
    if (name !== category.name)
      category.code = null;
    category.name = name;
    category.color = color;
    return { code: 'TASKS_CATEGORY_SAVED', data: this.categoryDto(category) };
  }

  /** A first PIN needs no old one; to change it the current PIN is checked unless the login is fresh. Saving it unlocks this session. */
  private setPin(me: TasksDemoUser, form: Record<string, unknown>): TasksDemoResult {
    const pin = String(form['pin'] ?? '').trim();
    if (pin.length !== PIN.length || !/^\d+$/.test(pin))
      throw new DemoFailure(400, 'TASKS_PIN_INVALID', [PIN.length]);
    if (this.weakPin(pin))
      throw new DemoFailure(400, 'TASKS_PIN_WEAK');
    if (me.pinHash && !this.fresh()) {
      if (form['currentPin'] == null)
        throw new DemoFailure(400, 'TASKS_PIN_CURRENT');
      this.checkPin(me, String(form['currentPin']));
    }
    me.pinHash = this.hash(pin);
    me.pinFailed = 0;
    me.pinLockedUntil = null;
    this.setLock(me, true);
    return { code: 'TASKS_PIN_SAVED', data: this.pinStatus(me) };
  }

  /** Turning the lock off needs the PIN (or a fresh login, like a reset). */
  private removePin(me: TasksDemoUser, form: Record<string, unknown>): TasksDemoResult {
    if (!me.pinHash)
      throw new DemoFailure(400, 'TASKS_PIN_NOT_SET');
    if (!this.fresh())
      this.checkPin(me, String(form['pin'] ?? ''));
    me.pinHash = null;
    me.pinFailed = 0;
    me.pinLockedUntil = null;
    return { code: 'TASKS_PIN_REMOVED', data: this.pinStatus(me) };
  }

  private checkCategory(form: Record<string, unknown>): { name: string; color: string } {
    const name = String(form['name'] ?? '').trim();
    const color = String(form['color'] ?? '');
    if (!name || name.length > NAME_LENGTH || !COLOR.test(color))
      throw new DemoFailure(400, 'TASKS_INVALID');
    return { name, color: color.toLowerCase() };
  }

  private saveSettings(me: TasksDemoUser, form: Record<string, unknown>, isSuper: boolean): TasksDemoResult {
    const lock = Number(form['lockAfterMinutes']);
    const priority = Number(form['defaultPriority']);
    const valid = LOCK_MINUTES.includes(lock) && WEEK_STARTS.includes(String(form['weekStart'])) && TABS.includes(String(form['defaultTab'])) && REMIND_BEFORES.includes(String(form['remindBefore'])) && [1, 2, 3].includes(priority) && /^([01]\d|2[0-3]):[0-5]\d$/.test(String(form['reminderTime'])) && this.validZone(String(form['timeZone'] ?? ''));
    if (!valid)
      throw new DemoFailure(400, 'TASKS_INVALID');
    const categoryId = form['defaultCategoryId'] == null ? null : Number(form['defaultCategoryId']);
    if (categoryId !== null)
      this.category(categoryId);
    Object.assign(me, {
      lockAfterMinutes: lock,
      notificationsEnabled: form['notificationsEnabled'] === true,
      reminderTime: String(form['reminderTime']),
      remindBefore: String(form['remindBefore']),
      overdueReminders: form['overdueReminders'] === true,
      upcomingReminders: form['upcomingReminders'] === true,
      weekStart: String(form['weekStart']),
      defaultTab: String(form['defaultTab']),
      defaultPriority: priority,
      defaultCategoryId: categoryId,
      whatsAppReminders: form['whatsAppReminders'] === true,
      timeZone: String(form['timeZone']),
    });
    return { code: 'TASKS_SETTINGS_SAVED', data: this.settingsDto(me, isSuper) };
  }

  private bulkOne(task: TasksDemoTask, action: string, categoryId: number | null, work: TasksDemoWork): void {
    if (action === 'complete')
      this.complete(task, false, work);
    else if (action === 'reopen')
      this.reopen(task, false, work);
    else if (action === 'delete')
      this.softDelete(task, work);
    else if (action === 'duplicate')
      this.duplicate(task, work);
    else if (task.categoryId !== categoryId) {
      task.categoryId = categoryId;
      this.touch(task, work);
      work.log(task, 'edited', 'category');
    }
  }

  /** Finds the task, runs the change and answers with its message. */
  private change(id: number, code: string, work: (task: TasksDemoTask, work: TasksDemoWork) => void): TasksDemoResult {
    const changes = new TasksDemoWork();
    work(this.task(id), changes);
    return { code, data: this.finish(changes) };
  }

  // #endregion
}
