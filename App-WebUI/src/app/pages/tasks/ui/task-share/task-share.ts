import { TaskIcon } from '../task-icon/task-icon';
import { I18nService } from '../../../../core/i18n.service';
import { TasksApiService } from '../../../../core/tasks-api.service';
import { TasksStateService } from '../../../../core/tasks-state.service';
import { TaskItem, TaskShare, TaskSharePermission } from '../../../../core/models/tasks.model';
import { Component, ElementRef, OnInit, ViewEncapsulation, inject, input, signal, viewChild } from '@angular/core';

/**
 * The sheet that shares a task (owner only): the e-mail address or mobile number of an account and a permission (can view, can edit), then the people
 * the task is shared with, each with their answer (waiting, accepted, declined), a permission to change and a button to stop sharing.
 */
@Component({
  selector: 'app-task-share',
  imports: [TaskIcon],
  templateUrl: './task-share.html',
  styleUrl: './task-share.scss',
  encapsulation: ViewEncapsulation.None,
  host: { '(document:keydown.escape)': 'close()' },
})

export class TaskShareSheet implements OnInit {
  protected readonly to = signal('');
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  readonly task = input.required<TaskItem>();
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(TasksApiService);
  protected readonly state = inject(TasksStateService);
  protected readonly people = signal<TaskShare[] | null>(null);
  protected readonly permission = signal<TaskSharePermission>('read');
  protected readonly permissions: TaskSharePermission[] = ['read', 'edit'];
  private readonly toInput = viewChild.required<ElementRef<HTMLInputElement>>('toInput');

  // #region Public Methods

  close(): void {
    this.state.sharing.set(null);
  }

  ngOnInit(): void {
    void this.loadPeople();
    setTimeout(() => this.toInput().nativeElement.focus(), 50);
  }

  /** Closes when the dark area around the sheet is clicked (not the sheet itself). */
  scrim(event: MouseEvent): void {
    if (event.target === event.currentTarget)
      this.close();
  }

  async send(event: Event): Promise<void> {
    event.preventDefault();
    const to = this.to().trim();
    if (!to) {
      this.error.set(this.i18n.t('tasks.share.toRequired'));
      this.toInput().nativeElement.focus();
      return;
    }
    if (this.busy())
      return;
    this.busy.set(true);
    try {
      const saved = await this.state.share(this.task(), to, this.permission());
      if (saved) {
        this.put(saved);
        this.to.set('');
      }
    } finally {
      this.busy.set(false);
    }
  }

  async remove(share: TaskShare): Promise<void> {
    if (await this.state.stopShare(share))
      this.people.update((list) => (list ?? []).filter((p) => p.id !== share.id));
  }

  /** A new permission for someone the task is already shared with (sharing again with the same person). */
  async change(share: TaskShare, permission: TaskSharePermission): Promise<void> {
    const saved = await this.state.share(this.task(), share.sharedWith, permission);
    if (saved)
      this.put(saved);
  }

  // #endregion

  // #region Private Methods

  private put(share: TaskShare): void {
    this.people.update((list) => [...(list ?? []).filter((p) => p.id !== share.id), share]);
  }

  private async loadPeople(): Promise<void> {
    this.people.set(await this.api.shares(this.task().id).catch(() => []));
  }

  // #endregion
}
