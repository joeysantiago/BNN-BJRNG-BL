import { TaskIcon } from '../task-icon/task-icon';
import { I18nService } from '../../../../core/i18n.service';
import { TasksApiService } from '../../../../core/tasks-api.service';
import { TaskDatePicker } from '../task-date-picker/task-date-picker';
import { TasksStateService } from '../../../../core/tasks-state.service';
import { formatYmd, isDone, statusOf, timeOf } from '../../../../core/tasks-dates';
import { TASK_PHOTO_TYPES, compressPhoto, photoName } from '../../../../core/tasks-photos';
import { Component, ElementRef, OnDestroy, OnInit, ViewEncapsulation, computed, inject, input, signal, viewChild } from '@angular/core';
import { TaskAttachment, TaskDraftItem, TaskDraftPhoto, TaskEditorState, TaskHistoryEntry, TaskRepeat, TaskRequest } from '../../../../core/models/tasks.model';

/**
 * The sheet that adds or edits a task: title (required), description, due date and time, category, status, priority, checklist (add, edit,
 * tick, reorder, remove), pictures (gallery or camera, preview, replace, remove), repeat, reminder and the history of the task.
 * New pictures are shrunk on the device and uploaded after the task is saved; removed ones are removed on save.
 */
@Component({
  selector: 'app-task-editor',
  imports: [TaskIcon, TaskDatePicker],
  templateUrl: './task-editor.html',
  styleUrl: './task-editor.scss',
  encapsulation: ViewEncapsulation.None,
  host: { '(document:keydown.escape)': 'close()' },
})

export class TaskEditor implements OnInit, OnDestroy {
  private key = 0;
  protected readonly due = signal('');
  protected readonly every = signal(1);
  protected readonly time = signal('');
  protected readonly error = signal('');
  protected readonly title = signal('');
  protected readonly newItem = signal('');
  protected readonly priority = signal(2);
  protected readonly formatYmd = formatYmd;
  protected readonly remind = signal(true);
  protected readonly saving = signal(false);
  protected readonly unit = signal('month');
  protected readonly started = signal(false);
  protected readonly description = signal('');
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(TasksApiService);
  private replacing: number | string | null = null;
  protected readonly removed = signal<number[]>([]);
  readonly editor = input.required<TaskEditorState>();
  protected readonly state = inject(TasksStateService);
  protected readonly accept = TASK_PHOTO_TYPES.join(',');
  protected readonly items = signal<TaskDraftItem[]>([]);
  protected readonly repeat = signal<TaskRepeat>('none');
  protected readonly photos = signal<TaskDraftPhoto[]>([]);
  protected readonly category = signal<number | null>(null);
  protected readonly units = ['day', 'week', 'month', 'year'];
  protected readonly task = computed(() => this.editor().task);
  protected readonly history = signal<TaskHistoryEntry[] | null>(null);
  protected readonly done = computed(() => !!this.task() && isDone(this.task()!));
  private readonly camera = viewChild.required<ElementRef<HTMLInputElement>>('camera');
  private readonly picker = viewChild.required<ElementRef<HTMLInputElement>>('picker');
  protected readonly ticked = computed(() => this.items().filter((i) => i.isDone).length);
  private readonly replacer = viewChild.required<ElementRef<HTMLInputElement>>('replacer');
  protected readonly photoCount = computed(() => this.kept().length + this.photos().length);
  private readonly titleInput = viewChild.required<ElementRef<HTMLInputElement>>('titleInput');
  protected readonly maxPhotos = computed(() => this.state.settings()?.limits.maxPhotosPerTask ?? 0);
  protected readonly repeats: TaskRepeat[] = ['none', 'daily', 'weekly', 'monthly', 'yearly', 'custom'];
  protected readonly status = computed(() => (this.task() ? statusOf(this.task()!, this.state.clock()) : null));
  protected readonly kept = computed<TaskAttachment[]>(() => (this.task()?.attachments ?? []).filter((a) => !this.removed().includes(a.id)));

  // #region Public Methods

  close(): void {
    this.state.editor.set(null);
  }

  addItem(): void {
    const text = this.newItem().trim();
    if (!text)
      return;
    this.items.update((list) => [...list, { key: ++this.key, id: null, text, isDone: false }]);
    this.newItem.set('');
  }

  ngOnInit(): void {
    this.fill();
    setTimeout(() => this.titleInput().nativeElement.focus(), 50);
  }

  ngOnDestroy(): void {
    for (const p of this.photos())
      URL.revokeObjectURL(p.url);
  }

  tick(key: number): void {
    this.items.update((list) => list.map((i) => (i.key === key ? { ...i, isDone: !i.isDone } : i)));
  }

  /** Shows the pictures full size, from the given one. */
  view(index: number): void {
    const urls = [...this.kept().map((a) => this.state.photoUrl(a.id)), ...this.photos().map((p) => p.url)];
    this.state.viewer.set({ index, urls });
  }

  dropItem(key: number): void {
    this.items.update((list) => list.filter((i) => i.key !== key));
  }

  dropSaved(id: number): void {
    this.removed.update((list) => [...list, id]);
  }

  dropPhoto(key: number): void {
    const photo = this.photos().find((p) => p.key === key);
    if (photo)
      URL.revokeObjectURL(photo.url);
    this.photos.update((list) => list.filter((p) => p.key !== key));
  }

  stamp(value: string): string {
    const d = new Date(value);
    return `${formatYmd(this.localYmd(d))} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  async remove(): Promise<void> {
    const task = this.task();
    if (!task)
      return;
    await this.state.remove([task.id]);
    this.close();
  }

  /** Closes when the dark area around the sheet is clicked (not the sheet itself). */
  scrim(event: MouseEvent): void {
    if (event.target === event.currentTarget)
      this.close();
  }

  async duplicate(): Promise<void> {
    const task = this.task();
    if (task && (await this.state.duplicate(task)))
      this.close();
  }

  /** Completes or reopens the task from the sheet, then closes it. */
  async toggleDone(): Promise<void> {
    const task = this.task();
    if (task && (await this.state.toggle(task)))
      this.close();
  }

  edit(key: number, text: string): void {
    this.items.update((list) => list.map((i) => (i.key === key ? { ...i, text } : i)));
  }

  pick(which: 'picker' | 'camera'): void {
    this.replacing = null;
    this[which]().nativeElement.click();
  }

  /** Replaces a saved picture (its id) or a new one (its key) with the next picked picture. */
  replace(target: number | string): void {
    this.replacing = target;
    this.replacer().nativeElement.click();
  }

  moveItem(key: number, step: number): void {
    const list = [...this.items()];
    const from = list.findIndex((i) => i.key === key);
    const to = from + step;
    if (from < 0 || to < 0 || to >= list.length)
      return;
    [list[from], list[to]] = [list[to], list[from]];
    this.items.set(list);
  }

  historyText(entry: TaskHistoryEntry): string {
    const detail = entry.detail ?? '';
    const fields = detail.split(',').filter(Boolean).map((f) => this.i18n.t('tasks.field.' + f)).join(', ');
    return this.i18n.t('tasks.hist.' + entry.action, { detail: entry.action === 'edited' ? fields : detail });
  }

  async loadHistory(event: Event): Promise<void> {
    const task = this.task();
    if (!task || !(event.target as HTMLDetailsElement).open || this.history())
      return;
    this.history.set(await this.api.history(task.id).catch(() => []));
  }

  async picked(input: HTMLInputElement): Promise<void> {
    const files = Array.from(input.files ?? []);
    input.value = '';
    for (const file of files) {
      if (!this.replacing && this.photoCount() >= this.maxPhotos()) {
        this.state.toast(this.i18n.t('tasks.photo.limit', { n: this.maxPhotos() }), true);
        break;
      }
      const photo = await this.prepare(file);
      if (!photo)
        continue;
      if (typeof this.replacing === 'number')
        this.dropSaved(this.replacing);
      else if (typeof this.replacing === 'string')
        this.dropPhoto(Number(this.replacing));
      this.replacing = null;
      this.photos.update((list) => [...list, photo]);
    }
  }

  /** Saves the task, then the picture changes. With "more" the sheet stays open, empty, for the next task. */
  async save(event: Event | null, more = false): Promise<void> {
    event?.preventDefault();
    if (this.saving())
      return;
    this.addItem();
    if (!this.title().trim()) {
      this.error.set(this.i18n.t('tasks.ed.titleRequired'));
      this.titleInput().nativeElement.focus();
      return;
    }
    this.saving.set(true);
    try {
      const saved = await this.state.save(this.task()?.id ?? null, this.request());
      if (!saved)
        return;
      for (const id of this.removed())
        await this.state.removePhoto(id);
      await this.state.upload(saved.id, this.photos().map((p) => ({ file: p.file, name: p.name })));
      if (!more) {
        this.close();
        return;
      }
      this.state.editor.set({ task: null, due: this.due() || null });
      this.fill();
      this.titleInput().nativeElement.focus();
    } finally {
      this.saving.set(false);
    }
  }

  // #endregion

  // #region Private Methods

  /** Puts the task (or the defaults of a new one) in the draft. */
  private fill(): void {
    const t = this.task();
    const s = this.state.settings();
    const filter = this.state.category();
    for (const p of this.photos())
      URL.revokeObjectURL(p.url);
    this.title.set(t?.title ?? '');
    this.description.set(t?.description ?? '');
    this.due.set(t ? (t.dueDate ?? '') : (this.editor().due ?? ''));
    this.time.set(t ? timeOf(t) : '');
    this.category.set(t ? t.categoryId : filter !== 'all' ? filter : (s?.defaultCategoryId ?? null));
    this.priority.set(t?.priority ?? s?.defaultPriority ?? 2);
    this.started.set(t?.isStarted ?? false);
    this.remind.set(t?.remindEnabled ?? true);
    this.repeat.set(t?.repeatType ?? 'none');
    this.every.set(t?.repeatType === 'custom' ? t.repeatEvery : 1);
    this.unit.set(t?.repeatType === 'custom' && t.repeatUnit ? t.repeatUnit : 'month');
    this.items.set((t?.checklist ?? []).map((c) => ({ key: ++this.key, id: c.id, text: c.text, isDone: c.isDone })));
    this.photos.set([]);
    this.removed.set([]);
    this.history.set(null);
    this.newItem.set('');
    this.error.set('');
  }

  private request(): TaskRequest {
    const due = this.due() || null;
    const custom = this.repeat() === 'custom';
    return {
      title: this.title().trim(),
      description: this.description().trim() || null,
      dueDate: due,
      dueTime: due && this.time() ? this.time() + ':00' : null,
      priority: this.priority(),
      categoryId: this.category(),
      isStarted: this.started(),
      remindEnabled: this.remind(),
      repeatType: this.repeat(),
      repeatEvery: custom ? Math.min(99, Math.max(1, this.every())) : 1,
      repeatUnit: custom ? this.unit() : '',
      checklist: this.items().filter((i) => i.text.trim()).map((i) => ({ id: i.id, text: i.text.trim(), isDone: i.isDone })),
    };
  }

  private localYmd(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** Checks and shrinks one picked picture. Null (with a message) when it is not a picture or too large. */
  private async prepare(file: File): Promise<TaskDraftPhoto | null> {
    if (!TASK_PHOTO_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
      this.state.toast(this.i18n.t('tasks.photo.type', { name: file.name }), true);
      return null;
    }
    const limits = this.state.settings()?.limits;
    if (!limits || file.size > limits.maxPickedBytes) {
      this.state.toast(this.i18n.t('tasks.photo.big', { name: file.name }), true);
      return null;
    }
    try {
      const blob = await compressPhoto(file, limits.photoEdgePx);
      if (blob.size > limits.maxPhotoBytes) {
        this.state.toast(this.i18n.t('tasks.photo.big', { name: file.name }), true);
        return null;
      }
      return { key: ++this.key, file: blob, url: URL.createObjectURL(blob), name: photoName(file, blob) };
    } catch {
      this.state.toast(this.i18n.t('tasks.photo.type', { name: file.name }), true);
      return null;
    }
  }

  // #endregion
}
