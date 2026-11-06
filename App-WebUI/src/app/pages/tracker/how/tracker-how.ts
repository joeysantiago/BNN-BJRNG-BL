import { RouterLink } from '@angular/router';
import { Component, inject } from '@angular/core';
import { I18nService } from '../../../core/i18n.service';
import { TrackerStateService } from '../../../core/tracker-state.service';

/** How SnapTracker works (/tracker/app/how): the parts (Android app, server, this app) and the way from an SMS to a transaction, in plain words. */
@Component({
  selector: 'app-tracker-how',
  imports: [RouterLink],
  templateUrl: './tracker-how.html',
})

export class TrackerHow {
  protected readonly i18n = inject(I18nService);
  protected readonly parts = ['phone', 'server', 'app'];
  protected readonly state = inject(TrackerStateService);
  protected readonly steps = ['arrives', 'filtered', 'uploaded', 'understood', 'checked', 'yours'];
}
