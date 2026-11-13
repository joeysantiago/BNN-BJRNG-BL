import { RouterLink } from '@angular/router';
import { I18nService } from '../../../core/i18n.service';
import { TRACKER_SENDERS } from '../../../core/tracker-meta';
import { TrackerIcon } from '../ui/tracker-icon/tracker-icon';
import { TrackerPhoneService } from '../../../core/tracker-phone.service';
import { TrackerStateService } from '../../../core/tracker-state.service';
import { TrackerTrackingAction } from '../../../core/models/tracker.model';
import { Component, ViewEncapsulation, computed, inject } from '@angular/core';

/**
 * SMS reading and privacy, a part of the How page (/tracker/app/how#privacy; the old /tracker/app/privacy leads there): SMS reading on, paused or off,
 * why SnapTracker asks for it, what it reads (the past bank SMS of the phone too) and never reads, how a message is filtered, how many messages were
 * ignored, and the banks it knows. Downloading and deleting the data are on the Profile page (SnapTracker's part).
 */
@Component({
  selector: 'app-tracker-privacy',
  imports: [RouterLink, TrackerIcon],
  templateUrl: './tracker-privacy.html',
  styleUrl: './tracker-privacy.scss',
  encapsulation: ViewEncapsulation.None,
})

export class TrackerPrivacy {
  protected readonly i18n = inject(I18nService);
  protected readonly phone = inject(TrackerPhoneService);
  protected readonly state = inject(TrackerStateService);
  protected readonly read = ['sender', 'details', 'txn', 'inbox'];
  protected readonly never = ['otp', 'personal', 'promo', 'other'];
  protected readonly flow = ['sender', 'filters', 'upload', 'parse', 'review'];
  protected readonly banks = computed(() => [...new Set(Object.values(TRACKER_SENDERS))]);

  // #region Public Methods

  /** Sends every bank SMS of the phone again; the ones already in SnapTracker are skipped. */
  readAll(): void {
    void this.phone.readAll();
  }

  /** In the Android app the phone changes first (turning on shows the notice and Android's SMS permission popup). */
  tracking(action: TrackerTrackingAction): void {
    void this.phone.tracking(action);
  }

  // #endregion
}
