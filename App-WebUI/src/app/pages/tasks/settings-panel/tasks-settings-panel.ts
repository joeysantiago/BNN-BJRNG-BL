import { RouterLink } from '@angular/router';
import { I18nService } from '../../../core/i18n.service';
import { formatYmd, ymd } from '../../../core/tasks-dates';
import { ChoiceGroup } from '../../../shared/choice-group';
import { TasksPanelNotice } from './tasks-settings-panel.model';
import { TasksApiService } from '../../../core/tasks-api.service';
import { ChoiceOption } from '../../../shared/models/choice.model';
import { TasksStateService } from '../../../core/tasks-state.service';
import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { TaskCategory, TaskItem, TaskPinStatus, TaskSettings } from '../../../core/models/tasks.model';

const PALETTE = ['#d6489a', '#3a66f5', '#1f9d63', '#f5a524', '#8b5cf6', '#e5484d', '#0ea5b7', '#64748b'];

/**
 * My Tasks' own part of Settings > General (FEATURE_SETTINGS), for a user who may open My Tasks: the defaults of new tasks, App Lock, reminders (on this device and
 * by WhatsApp), categories and recently deleted tasks. Saved through the My Tasks API one setting at a time. The PIN screen belongs to the app, so turning the lock
 * on or off and changing the PIN open it there (/tasks/app?lock=). Theme, language, the app name, the mobile number and access are on the shared tabs and Profile.
 */
@Component({
  selector: 'app-tasks-settings-panel',
  imports: [RouterLink, ChoiceGroup],
  templateUrl: './tasks-settings-panel.html',
  styleUrl: './tasks-settings-panel.scss',
})

export class TasksSettingsPanel {
  protected readonly palette = PALETTE;
  protected readonly newName = signal('');
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(TasksApiService);
  protected readonly newColor = signal(PALETTE[1]);
  private readonly state = inject(TasksStateService);
  protected readonly categories = signal<TaskCategory[]>([]);
  protected readonly pin = signal<TaskPinStatus | null>(null);
  protected readonly deleted = signal<TaskItem[] | null>(null);
  protected readonly settings = signal<TaskSettings | null>(null);
  protected readonly notice = signal<TasksPanelNotice | null>(null);
  protected readonly appName = computed(() => this.i18n.page('tasks'));
  protected readonly permission = signal<NotificationPermission | 'unsupported'>(typeof Notification === 'undefined' ? 'unsupported' : 'default');
  protected readonly priorities = computed<ChoiceOption[]>(() => [1, 2, 3].map((p) => ({ value: String(p), label: this.i18n.t('tasks.pri.' + p) })));
  /** The pick-one settings, as choice groups. */
  protected readonly befores = computed<ChoiceOption[]>(() => ['0', '15m', '1h', '1d'].map((b) => ({ value: b, label: this.i18n.t('tasks.before.' + b) })));
  protected readonly tabs = computed<ChoiceOption[]>(() => ['all', 'active', 'completed'].map((v) => ({ value: v, label: this.i18n.t('tasks.tab.' + v) })));
  protected readonly weekStarts = computed<ChoiceOption[]>(() => [{ value: 'mon', label: this.i18n.t('tasks.set.monday') }, { value: 'sun', label: this.i18n.t('tasks.set.sunday') }]);
  protected readonly lockOptions = computed<ChoiceOption[]>(() => [0, 1, 5, 15, 30].map((m) => ({ value: String(m), label: m === 0 ? this.i18n.t('tasks.set.lockNowOption') : this.i18n.t('tasks.set.minutes', { n: m }) })));

  constructor() {
    afterNextRender(() => void this.load());
  }

  // #region Public Methods

  async test(): Promise<void> {
    const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    const body = this.i18n.t('tasks.notify.test');
    if (registration)
      await registration.showNotification(this.appName(), { body, icon: 'icons/tasks-192.png' });
    else
      new Notification(this.appName(), { body });
  }

  deletedOn(task: TaskItem): string {
    return task.deletedOn ? formatYmd(ymd(new Date(task.deletedOn))) : '';
  }

  /** Sends a test WhatsApp message to the mobile number of the profile. */
  async testWhatsApp(): Promise<void> {
    await this.run(async () => (await this.api.testWhatsApp()).message ?? '');
  }

  async askPermission(): Promise<void> {
    this.permission.set(await Notification.requestPermission());
  }

  /** A category name: built-in ones show translated until they are renamed. */
  categoryName(c: TaskCategory | null): string {
    return this.state.categoryName(c);
  }

  async restore(task: TaskItem): Promise<void> {
    await this.run(async () => {
      const text = (await this.api.restore(task.id)).message ?? '';
      this.deleted.update((list) => (list ?? []).filter((t) => t.id !== task.id));
      return text;
    });
  }

  async addCategory(event: Event): Promise<void> {
    event.preventDefault();
    const name = this.newName().trim();
    if (!name)
      return;
    await this.run(async () => {
      const res = await this.api.addCategory(name, this.newColor());
      this.categories.update((list) => [...list, res.data]);
      this.newName.set('');
      this.newColor.set(PALETTE[(this.categories().length + 1) % PALETTE.length]);
      return res.message ?? '';
    });
  }

  async removeCategory(c: TaskCategory): Promise<void> {
    await this.run(async () => {
      const text = (await this.api.deleteCategory(c.id)).message ?? '';
      this.categories.update((list) => list.filter((x) => x.id !== c.id));
      return text;
    });
  }

  async saveCategory(c: TaskCategory, name: string, color: string): Promise<void> {
    if (!name.trim() || (name.trim() === c.name && color === c.color))
      return;
    await this.run(async () => {
      const res = await this.api.saveCategory(c.id, name.trim(), color);
      this.categories.update((list) => list.map((x) => (x.id === c.id ? res.data : x)));
      return res.message ?? '';
    });
  }

  /** Saves one setting (the others stay as they are); the server answers with all of them. */
  async set<K extends keyof TaskSettings>(key: K, value: TaskSettings[K]): Promise<void> {
    const current = this.settings();
    if (!current)
      return;
    await this.run(async () => {
      const res = await this.api.saveSettings({ ...current, [key]: value });
      this.settings.set(res.data);
      this.state.settings.set(res.data);
      return res.message ?? '';
    });
  }

  // #endregion

  // #region Private Methods

  private async load(): Promise<void> {
    try {
      const [settings, categories, pin, deleted] = await Promise.all([this.api.settings(), this.api.categories(), this.api.pinStatus(), this.api.deleted()]);
      this.settings.set(settings);
      this.categories.set(categories);
      this.pin.set(pin);
      this.deleted.set(deleted);
      if (typeof Notification !== 'undefined')
        this.permission.set(Notification.permission);
    } catch (e) {
      this.notice.set({ text: (e as Error).message, error: true });
    }
  }

  private async run(work: () => Promise<string>): Promise<void> {
    this.notice.set(null);
    try {
      this.notice.set({ text: await work(), error: false });
    } catch (e) {
      this.notice.set({ text: (e as Error).message, error: true });
    }
  }

  // #endregion
}
