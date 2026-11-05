import { TaskClock, TaskGroup, TaskItem, TaskPeriods, TaskStatus, TaskTab } from './models/tasks.model';

/**
 * The date rules of My Tasks. Tasks are organised by their due date in the local calendar of the user, never by the creation date; months and
 * years are never hard-coded. Every function is pure, so the dashboard, the calendar and the bell agree.
 */

const pad = (n: number): string => String(n).padStart(2, '0');

/** YYYY-MM-DD of a local date. */
export const ymd = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** A YYYY-MM-DD string as a local date (midnight). */
export const parseYmd = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** The clock of this moment, for the given first day of the week. */
export const clockOf = (date: Date, sunday: boolean): TaskClock => ({ today: ymd(date), now: `${pad(date.getHours())}:${pad(date.getMinutes())}`, sunday });

/** The first day of the calendar week of a date (Monday, or Sunday when the user chose it). */
export const weekStart = (d: Date, sunday: boolean): Date => addDays(d, -(sunday ? d.getDay() : (d.getDay() + 6) % 7));

/** First and last day (YYYY-MM-DD) of the current week (offset 0) or a later one. */
export const weekRange = (clock: TaskClock, offset: number): [string, string] => {
  const start = addDays(weekStart(parseYmd(clock.today), clock.sunday), offset * 7);
  return [ymd(start), ymd(addDays(start, 6))];
};

/** HH:mm of a due time, or an empty string. */
export const timeOf = (task: TaskItem): string => task.dueTime?.slice(0, 5) ?? '';

export const isDone = (task: TaskItem): boolean => !!task.completedOn;

/** Due date passed (or due today with a time already passed) and not completed. Stays overdue until it is completed. */
export const isOverdue = (task: TaskItem, clock: TaskClock): boolean => {
  if (isDone(task) || !task.dueDate)
    return false;
  return task.dueDate < clock.today || (task.dueDate === clock.today && !!task.dueTime && clock.now > timeOf(task));
};

export const statusOf = (task: TaskItem, clock: TaskClock): TaskStatus => {
  if (isDone(task))
    return 'completed';
  if (isOverdue(task, clock))
    return 'overdue';
  return task.isStarted || task.checklist.some((c) => c.isDone) ? 'ongoing' : 'pending';
};

export const inTab = (task: TaskItem, tab: TaskTab): boolean => tab === 'all' || (tab === 'active' ? !isDone(task) : isDone(task));

/**
 * The secondary date filter. all, today, week (current week), nextweek, month (current month), upcoming (due after today), overdue, nodate,
 * m:YYYY-MM (one month) and y:YYYY (one year). It combines with the tab and the category, so every task matches each filter once.
 */
export const inScope = (task: TaskItem, scope: string, clock: TaskClock): boolean => {
  const due = task.dueDate;
  switch (scope) {
    case 'all':
      return true;
    case 'today':
      return due === clock.today;
    case 'week':
    case 'nextweek': {
      const [a, b] = weekRange(clock, scope === 'week' ? 0 : 1);
      return !!due && due >= a && due <= b;
    }
    case 'month':
      return !!due && due.slice(0, 7) === clock.today.slice(0, 7);
    case 'upcoming':
      return !!due && due > clock.today && !isDone(task);
    case 'overdue':
      return isOverdue(task, clock);
    case 'nodate':
      return !due;
    default:
      if (scope.startsWith('m:'))
        return !!due && due.slice(0, 7) === scope.slice(2);
      if (scope.startsWith('y:'))
        return !!due && due.slice(0, 4) === scope.slice(2);
      return true;
  }
};

/** The month and year chips: every month and year that has a task, plus the current ones, in order. */
export const periodsOf = (tasks: readonly TaskItem[], clock: TaskClock): TaskPeriods => {
  const months = new Set([clock.today.slice(0, 7)]);
  const years = new Set([clock.today.slice(0, 4)]);
  for (const t of tasks)
    if (t.dueDate) {
      months.add(t.dueDate.slice(0, 7));
      years.add(t.dueDate.slice(0, 4));
    }
  return { months: [...months].sort(), years: [...years].sort() };
};

/** "January 2027" in the language of the reader (Intl, so no month names are typed in code). */
export const monthLabel = (ym: string, locale: string): string => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, 1));

/** DD-MM-YYYY of a YYYY-MM-DD date (App-Document/date-format.md). */
export const formatYmd = (s: string | null): string => (s ? `${s.slice(8, 10)}-${s.slice(5, 7)}-${s.slice(0, 4)}` : '');

/** The group key of a task in the list: its rank (for sorting) and its heading. Labels are filled in by the caller (i18n). */
export const groupKey = (task: TaskItem, clock: TaskClock, tab: TaskTab): [number, string] => {
  if (isDone(task))
    return tab === 'completed' ? [10, 'c:' + ymd(new Date(task.completedOn!)).slice(0, 7)] : [20, 'completed'];
  if (isOverdue(task, clock))
    return [0, 'overdue'];
  if (!task.dueDate)
    return [9, 'nodate'];
  if (task.dueDate === clock.today)
    return [1, 'today'];
  if (task.dueDate === ymd(addDays(parseYmd(clock.today), 1)))
    return [2, 'tomorrow'];
  const [w0, w1] = weekRange(clock, 0);
  const [n0, n1] = weekRange(clock, 1);
  if (task.dueDate >= w0 && task.dueDate <= w1)
    return [3, 'week'];
  if (task.dueDate >= n0 && task.dueDate <= n1)
    return [4, 'nextweek'];
  if (task.dueDate.slice(0, 7) === clock.today.slice(0, 7))
    return [5, 'month'];
  return [6, 'm:' + task.dueDate.slice(0, 7)];
};

/** Sorts a list: by group, then by due date and time (or priority, or newest first), completed tasks by completion time. */
export const sortTasks = (list: readonly TaskItem[], clock: TaskClock, tab: TaskTab, sort: string): TaskItem[] => {
  const key = (t: TaskItem): (string | number)[] => {
    const [rank, group] = groupKey(t, clock, tab);
    if (sort === 'priority')
      return [rank, group, -t.priority, t.dueDate ?? '9999', timeOf(t) || '99'];
    if (sort === 'created')
      return [rank, group, -new Date(t.createdOn).getTime()];
    if (isDone(t) && tab === 'completed')
      return [rank, group, -new Date(t.completedOn!).getTime()];
    return [rank, group, t.dueDate ?? '9999', timeOf(t) || '99', -t.priority];
  };
  const keyed = list.map((t) => [key(t), t] as const);
  keyed.sort((a, b) => {
    for (let i = 0; i < a[0].length; i++)
      if (a[0][i] !== b[0][i])
        return a[0][i] < b[0][i] ? -1 : 1;
    return 0;
  });
  return keyed.map((k) => k[1]);
};

/** The list split under its headings, in order. */
export const groupTasks = (sorted: readonly TaskItem[], clock: TaskClock, tab: TaskTab, label: (key: string) => string): TaskGroup[] => {
  const groups: TaskGroup[] = [];
  for (const t of sorted) {
    const key = groupKey(t, clock, tab)[1];
    let group = groups.at(-1);
    if (group?.key !== key) {
      group = { key, label: label(key), overdue: key === 'overdue', tasks: [] };
      groups.push(group);
    }
    group.tasks.push(t);
  }
  return groups;
};

/** Text search over the title, description, checklist lines and category name. */
export const matches = (task: TaskItem, query: string, category: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q)
    return true;
  return [task.title, task.description ?? '', category, ...task.checklist.map((c) => c.text)].some((s) => s.toLowerCase().includes(q));
};

/** The 35 or 42 days of a month view, or the 7 days of a week view, starting on the first day of the week. */
export const calendarDays = (anchor: string, week: boolean, sunday: boolean): Date[] => {
  const first = week ? parseYmd(anchor) : new Date(Number(anchor.slice(0, 4)), Number(anchor.slice(5, 7)) - 1, 1);
  const start = weekStart(first, sunday);
  const days = Array.from({ length: week ? 7 : 42 }, (_, i) => addDays(start, i));
  return !week && ymd(days[35]).slice(0, 7) !== anchor.slice(0, 7) ? days.slice(0, 35) : days;
};
