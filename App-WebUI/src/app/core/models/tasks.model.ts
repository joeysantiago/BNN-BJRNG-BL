
/** The three primary tabs of the dashboard. */
export type TaskTab = 'all' | 'active' | 'completed';

export type TaskSort = 'due' | 'priority' | 'created';

/** Worked out from the local date and time of the viewer: overdue = due date (and time) passed and not completed. */
export type TaskStatus = 'pending' | 'ongoing' | 'overdue' | 'completed';

export type TaskRepeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

/** The App Lock screen: open (no lock screen), locked (enter the PIN), create / change / remove (the PIN flows of Settings). */
export type TaskLockMode = 'checking' | 'open' | 'locked' | 'create' | 'change' | 'remove';

export type TaskPinStep = 'unlock' | 'current' | 'new' | 'confirm';

/** A reminder of the bell: overdue, due today, or upcoming (the next three days). */
export type TaskReminderKind = 'od' | 'td' | 'up';

export interface TaskChecklistItem {
  id: number;
  text: string;
  isDone: boolean;
  doneOn: string | null;
}

export interface TaskAttachment {
  id: number;
  fileName: string;
  sizeBytes: number;
  contentType: string;
}

/** One task (TaskDto of the API). dueDate is YYYY-MM-DD and dueTime HH:mm:ss, both in the local calendar of the user. Priority: 1 low, 2 medium, 3 high. */
export interface TaskItem {
  id: number;
  title: string;
  priority: number;
  createdOn: string;
  isStarted: boolean;
  repeatUnit: string;
  repeatEvery: number;
  dueDate: string | null;
  dueTime: string | null;
  remindEnabled: boolean;
  repeatType: TaskRepeat;
  deletedOn: string | null;
  categoryId: number | null;
  modifiedOn: string | null;
  completedOn: string | null;
  description: string | null;
  attachments: TaskAttachment[];
  checklist: TaskChecklistItem[];
}

export interface TaskChecklistRequest {
  id: number | null;
  text: string;
  isDone: boolean;
}

export interface TaskRequest {
  title: string;
  priority: number;
  isStarted: boolean;
  repeatUnit: string;
  repeatEvery: number;
  dueDate: string | null;
  dueTime: string | null;
  remindEnabled: boolean;
  repeatType: TaskRepeat;
  categoryId: number | null;
  description: string | null;
  checklist: TaskChecklistRequest[];
}

/** What a change did: new or changed tasks (a completed repeating task also brings its next one) and deleted ids. */
export interface TaskChanges {
  tasks: TaskItem[];
  deletedIds: number[];
}

/** Code is set for the built-in categories (named through tasks.cat.<code>); Marketing is the system one. */
export interface TaskCategory {
  id: number;
  name: string;
  color: string;
  isSystem: boolean;
  taskCount: number;
  code: string | null;
}

/** The limits of the app, from the AppSettings table of the server (codes Tasks.*). */
export interface TaskLimits {
  photoEdgePx: number;
  maxBulkTasks: number;
  maxCategories: number;
  maxPhotoBytes: number;
  maxPickedBytes: number;
  maxPhotosPerTask: number;
  maxChecklistItems: number;
}

export interface TaskSettings {
  timeZone: string;
  weekStart: string;
  limits: TaskLimits;
  defaultTab: TaskTab;
  remindBefore: string;
  reminderTime: string;
  mobile: string | null;
  defaultPriority: number;
  lockAfterMinutes: number;
  overdueReminders: boolean;
  upcomingReminders: boolean;
  whatsAppReminders: boolean;
  notificationsEnabled: boolean;
  defaultCategoryId: number | null;
}

export interface TaskHistoryEntry {
  at: string;
  action: string;
  detail: string | null;
}

export interface TaskPinStatus {
  length: number;
  hasPin: boolean;
  locked: boolean;
  canReset: boolean;
  lockAfterMinutes: number;
  lockedUntil: string | null;
}

/** The moment the date rules are worked out for: today (YYYY-MM-DD), the time (HH:mm) and the first day of the week. */
export interface TaskClock {
  now: string;
  today: string;
  sunday: boolean;
}

export interface TaskReminder {
  task: TaskItem;
  kind: TaskReminderKind;
}

/** A heading of the task list (Overdue, Today, January 2027, ...) with its tasks. */
export interface TaskGroup {
  key: string;
  label: string;
  overdue: boolean;
  tasks: TaskItem[];
}

export interface TaskSummary {
  done: number;
  total: number;
  active: number;
  overdue: number;
}

/** The month (YYYY-MM) and year chips, built from the due dates of the tasks plus the current month and year. */
export interface TaskPeriods {
  years: string[];
  months: string[];
}

export interface TaskToast {
  id: number;
  text: string;
  error: boolean;
  undo: (() => void) | null;
}

/** The editor sheet: an existing task, or a new one (optionally on a given due date). */
export interface TaskEditorState {
  due: string | null;
  task: TaskItem | null;
}

/** A checklist line while the editor is open. key is local; id is null for a new line. */
export interface TaskDraftItem {
  id: number | null;
  key: number;
  text: string;
  isDone: boolean;
}

/** A picture picked in the editor, not uploaded yet. */
export interface TaskDraftPhoto {
  file: Blob;
  key: number;
  url: string;
  name: string;
}

/** One day of the calendar. */
export interface TaskCalendarDay {
  day: number;
  key: string;
  out: boolean;
  today: boolean;
  tasks: TaskItem[];
}

/** A question the user must answer before a change that cannot be undone (delete my account, delete a user). */
export interface TaskConfirm {
  text: string;
  action: string;
  resolve: (ok: boolean) => void;
}

/** The answer of a change on the Users tab. */
export interface TaskNotice {
  text: string;
  error: boolean;
}

/** One picture shown full size. */
export interface TaskViewerState {
  index: number;
  urls: string[];
}
