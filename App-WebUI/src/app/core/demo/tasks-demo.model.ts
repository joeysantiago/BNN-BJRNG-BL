import { TaskRepeat, TaskTab } from '../models/tasks.model';

/** A checklist line of a task (TaskChecklistItems table). `deleted` = IsSoftDeleted. */
export interface TasksDemoLine {
  id: number;
  text: string;
  isDone: boolean;
  deleted?: boolean;
  sortOrder: number;
  doneOn: string | null;
}

/** A picture of a task (TaskAttachments table). The picture itself is the row of `files` with the same id. */
export interface TasksDemoPhoto {
  id: number;
  fileName: string;
  deleted?: boolean;
  sizeBytes: number;
  sortOrder: number;
  contentType: string;
}

/** A task (TaskItems table). `ownerId` is the account's user id (the API maps it to a TaskUsers row; the demo uses it directly). */
export interface TasksDemoTask {
  id: number;
  title: string;
  ownerId: number;
  priority: number;
  createdOn: string;
  deleted?: boolean;
  isStarted: boolean;
  repeatUnit: string;
  repeatEvery: number;
  dueDate: string | null;
  dueTime: string | null;
  lines: TasksDemoLine[];
  remindEnabled: boolean;
  repeatSpawned: boolean;
  repeatType: TaskRepeat;
  deletedOn: string | null;
  photos: TasksDemoPhoto[];
  categoryId: number | null;
  modifiedOn: string | null;
  completedOn: string | null;
  description: string | null;
}

/** A category of a user (TaskCategories table). `code` names a built-in one until it is renamed; Marketing is the system one. */
export interface TasksDemoCategory {
  id: number;
  name: string;
  color: string;
  ownerId: number;
  deleted?: boolean;
  isSystem: boolean;
  sortOrder: number;
  code: string | null;
}

/** A line of the history of a task (TaskHistory table). */
export interface TasksDemoHistory {
  at: string;
  action: string;
  taskId: number;
  detail: string | null;
}

/** The My Tasks settings and App Lock of one account (TaskUsers table). The PIN is kept as a SHA-256 hash. */
export interface TasksDemoUser {
  timeZone: string;
  pinFailed: number;
  weekStart: string;
  defaultTab: TaskTab;
  remindBefore: string;
  reminderTime: string;
  pinHash: string | null;
  defaultPriority: number;
  lockAfterMinutes: number;
  overdueReminders: boolean;
  upcomingReminders: boolean;
  whatsAppReminders: boolean;
  notificationsEnabled: boolean;
  pinLockedUntil: number | null;
  defaultCategoryId: number | null;
}

/** A picture as a data: URL, so it can live in this browser's storage with the rest of the demo database. */
export interface TasksDemoFile {
  id: number;
  data: string;
}

/** Everything of My Tasks in the demo database. `locks`: login session token → unlocked until (ms), null when locked (TaskLockSessions). */
export interface TasksDemoDb {
  files: TasksDemoFile[];
  tasks: TasksDemoTask[];
  history: TasksDemoHistory[];
  categories: TasksDemoCategory[];
  locks: Record<string, number | null>;
  users: Record<number, TasksDemoUser>;
}

/** What one call answers: a message code (with its {0} values), the data, or a file. */
export interface TasksDemoResult {
  code?: string;
  data?: unknown;
  args?: (string | number)[];
}
