import { Component, inject } from '@angular/core';
import { TASKS_TEXTS } from '../../../i18n/tasks';
import { TasksSettingsPanel } from './tasks-settings-panel';
import { I18nService } from '../../../core/i18n.service';

/**
 * My Tasks' part of Settings > General in Mojito: the same panel as the API branches, after adding My Tasks' texts (i18n/tasks.ts). The API branches load
 * every text from the Translations table; Mojito adds My Tasks' only when one of its screens opens, and Settings > General is not one of them.
 */
@Component({
  selector: 'app-tasks-settings-panel-mojito',
  imports: [TasksSettingsPanel],
  template: '<app-tasks-settings-panel />',
})

export class TasksSettingsPanelMojito {
  constructor() {
    inject(I18nService).extend(TASKS_TEXTS);
  }
}
