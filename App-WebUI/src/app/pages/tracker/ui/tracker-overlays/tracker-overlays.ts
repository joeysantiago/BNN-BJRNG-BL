import { TrackerIcon } from '../tracker-icon/tracker-icon';
import { I18nService } from '../../../../core/i18n.service';
import { Component, ViewEncapsulation, inject } from '@angular/core';
import { TrackerStateService } from '../../../../core/tracker-state.service';

/**
 * SnapTracker's toasts. Its styles carry the shared controls (switches, segments, notes, toasts, confirm box) and SnapTracker's own parts (rows, chips,
 * drawer, Add sheet, steps, alerts), global under .st; it is always on screen in the app, so every screen and dialog shares them.
 */
@Component({
  selector: 'app-tracker-overlays',
  imports: [TrackerIcon],
  templateUrl: './tracker-overlays.html',
  styleUrl: './tracker-overlays.scss',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents' },
})

export class TrackerOverlays {
  protected readonly i18n = inject(I18nService);
  protected readonly state = inject(TrackerStateService);
}
