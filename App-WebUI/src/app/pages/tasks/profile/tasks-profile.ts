import { LANGS, Lang } from '../../../core/site';
import { TaskIcon } from '../ui/task-icon/task-icon';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { I18nService } from '../../../core/i18n.service';
import { UserAvatar } from '../../../shared/user-avatar';
import { TasksSettings } from '../settings/tasks-settings';
import { ProfileDetails } from '../../../core/models/auth.model';
import { TasksApiService } from '../../../core/tasks-api.service';
import { TasksStateService } from '../../../core/tasks-state.service';
import { Component, ViewEncapsulation, afterNextRender, computed, inject, signal } from '@angular/core';

/**
 * The profile inside My Tasks. It is the common account of the site (the same login, name, picture and language as every other app), so there is no
 * second account; app access stays separate: having My Tasks never gives SnapKhata, and the other way round. Password and sessions are on the common profile page.
 * The Settings of the app (TasksSettings) are shown below the account, on the same screen.
 */
@Component({
  selector: 'app-tasks-profile',
  imports: [TaskIcon, UserAvatar, RouterLink, TasksSettings],
  templateUrl: './tasks-profile.html',
  styleUrl: './tasks-profile.scss',
  encapsulation: ViewEncapsulation.None,
})

export class TasksProfile {
  protected readonly langs = LANGS;
  protected readonly busy = signal(false);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(TasksApiService);
  protected readonly state = inject(TasksStateService);
  protected readonly details = signal<ProfileDetails | null>(null);
  protected readonly appName = computed(() => this.i18n.page('tasks'));
  protected readonly apps = computed(() => [
    { name: this.appName(), has: this.auth.hasApp('tasks'), detail: this.i18n.t('tasks.prof.yourTasks', { n: this.state.tasks().length }) },
    { name: this.i18n.page('khata'), has: this.auth.hasApp('khata'), detail: this.i18n.t('tasks.prof.separate') },
  ]);

  constructor() {
    afterNextRender(() => void this.auth.details().then((d) => this.details.set(d), () => undefined));
  }

  // #region Public Methods

  async logout(): Promise<void> {
    await this.auth.logout();
  }

  /**
   * Deletes the My Tasks account of the user after a confirmation: their tasks, pictures and settings in this app, and their access to it. The common
   * account, its login and the other apps stay. An administrator keeps access (by role) and starts again with an empty app; anyone else leaves the app.
   */
  async deleteAccount(): Promise<void> {
    const app = this.appName();
    if (!(await this.state.confirm(this.i18n.t('tasks.prof.deleteConfirm', { app }), this.i18n.t('tasks.prof.deleteButton', { app }))))
      return;
    this.busy.set(true);
    try {
      const text = (await this.api.deleteAccount()).message ?? '';
      await this.auth.renewSession();
      if (this.auth.hasApp('tasks')) {
        await this.state.load();
        this.state.toast(text);
        return;
      }
      this.state.toast(text);
      setTimeout(() => void this.router.navigate(['/profile']), 2500);
    } catch (e) {
      this.state.toast((e as Error).message, true);
    } finally {
      this.busy.set(false);
    }
  }

  async removePicture(): Promise<void> {
    await this.run(() => this.auth.removeAvatar());
  }

  async save(event: Event): Promise<void> {
    event.preventDefault();
    const data = new FormData(event.target as HTMLFormElement);
    const lang = String(data.get('language'));
    await this.run(() => this.auth.updateProfile(String(data.get('displayName') ?? '').trim(), lang));
    if (LANGS.some((l) => l.code === lang))
      this.i18n.set(lang as Lang);
  }

  /** Saves the mobile number of the common profile (also used for one-time codes); WhatsApp reminders go to it. */
  async saveMobile(event: Event): Promise<void> {
    event.preventDefault();
    const details = this.details();
    if (!details)
      return;
    const mobile = String(new FormData(event.target as HTMLFormElement).get('mobile') ?? '').trim() || null;
    await this.run(() => this.auth.saveDetails({ ...details, mobile }));
    this.details.set(await this.auth.details());
    const settings = await this.api.settings().catch(() => null);
    if (settings)
      this.state.settings.set(settings);
  }

  async picture(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (file)
      await this.run(() => this.auth.uploadAvatar(file));
  }

  // #endregion

  // #region Private Methods

  private async run(call: () => Promise<string>): Promise<void> {
    this.busy.set(true);
    try {
      this.state.toast(await call());
    } catch (e) {
      this.state.toast((e as Error).message, true);
    } finally {
      this.busy.set(false);
    }
  }

  // #endregion
}
