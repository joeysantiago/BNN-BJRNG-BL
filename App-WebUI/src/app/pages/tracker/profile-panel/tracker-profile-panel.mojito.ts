import { Component, inject } from '@angular/core';
import { TRACKER_TEXTS } from '../../../i18n/tracker';
import { I18nService } from '../../../core/i18n.service';
import { TrackerProfilePanel } from './tracker-profile-panel';

/**
 * SnapTracker's part of the Profile page in Mojito: the same panel as the API branches, after adding SnapTracker's texts (i18n/tracker.ts). The API branches load
 * every text from the Translations table; Mojito adds SnapTracker's only when one of its screens opens, and the Profile page is not one of them.
 */
@Component({
  selector: 'app-tracker-profile-panel-mojito',
  imports: [TrackerProfilePanel],
  template: '<app-tracker-profile-panel />',
})

export class TrackerProfilePanelMojito {
  constructor() {
    inject(I18nService).extend(TRACKER_TEXTS);
  }
}
