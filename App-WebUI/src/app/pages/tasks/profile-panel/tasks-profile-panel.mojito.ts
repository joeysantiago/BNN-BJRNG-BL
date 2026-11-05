import { Component, inject } from '@angular/core';
import { TASKS_TEXTS } from '../../../i18n/tasks';
import { TasksProfilePanel } from './tasks-profile-panel';
import { I18nService } from '../../../core/i18n.service';

/**
 * My Tasks' part of the Profile page in Mojito: the same panel as the API branches, after adding My Tasks' texts (i18n/tasks.ts). The API branches load
 * every text from the Translations table; Mojito adds My Tasks' only when one of its screens opens, and the Profile page is not one of them.
 */
@Component({
  selector: 'app-tasks-profile-panel-mojito',
  imports: [TasksProfilePanel],
  template: '<app-tasks-profile-panel />',
})

export class TasksProfilePanelMojito {
  constructor() {
    inject(I18nService).extend(TASKS_TEXTS);
  }
}
