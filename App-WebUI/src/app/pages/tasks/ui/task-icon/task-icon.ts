import { DomSanitizer } from '@angular/platform-browser';
import { TASK_ICONS } from '../../../../core/tasks-icons';
import { Component, ViewEncapsulation, computed, inject, input } from '@angular/core';

/** One line icon of My Tasks. The drawings are fixed strings of tasks-icons.ts, never user input. */
@Component({
  selector: 'app-task-icon',
  templateUrl: './task-icon.html',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents' },
})

export class TaskIcon {
  readonly size = input(20);
  readonly name = input.required<string>();
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly svg = computed(() => this.sanitizer.bypassSecurityTrustHtml(TASK_ICONS[this.name()] ?? ''));
}
