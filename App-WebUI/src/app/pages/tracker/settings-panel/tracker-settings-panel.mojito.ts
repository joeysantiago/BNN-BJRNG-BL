import { Component, inject } from '@angular/core';
import { TRACKER_TEXTS } from '../../../i18n/tracker';
import { I18nService } from '../../../core/i18n.service';
import { TrackerSettingsPanel } from './tracker-settings-panel';

/**
 * SnapTracker's part of Settings > General in Mojito: the same panel as the API branches will have, after adding SnapTracker's texts (i18n/tracker.ts).
 * The API branches load every text from the Translations table; Mojito adds SnapTracker's only when one of its screens opens, and Settings > General is not one of them.
 */
@Component({
  selector: 'app-tracker-settings-panel-mojito',
  imports: [TrackerSettingsPanel],
  template: '<app-tracker-settings-panel />',
})

export class TrackerSettingsPanelMojito {
  constructor() {
    inject(I18nService).extend(TRACKER_TEXTS);
  }
}
