import { nativePlugin } from './native-app';
import { I18nService } from './i18n.service';
import { Injectable, inject } from '@angular/core';
import { TRACKER_IMPORT_BATCH } from './tracker-backup';
import { TrackerStateService } from './tracker-state.service';
import { NativeSms, SmsTrackerPlugin } from './models/native-app.model';
import { TrackerImportSms, TrackerTrackingAction } from './models/tracker.model';

/**
 * SnapTracker in the Android app (thakurg-Apps/thakurg-android, plugin SmsTracker). Turning tracking on shows the app's notice and then Android's SMS
 * permission popup, and only when the user allows it is tracking turned on in the account too. While tracking is on, the bank SMS the phone caught (new
 * ones as they arrive, and the inbox since tracking was turned on) go through POST /tracker/sms/import, which skips any it already has: when SnapTracker
 * opens, when the app comes back to the front, and at once when a new bank SMS arrives. In a browser there is no plugin, and tracking changes only the account.
 */
@Injectable({ providedIn: 'root' })

export class TrackerPhoneService {
  private busy = false;
  private again = false;
  private started = false;
  private readonly i18n = inject(I18nService);
  private readonly state = inject(TrackerStateService);
  private readonly sms = nativePlugin<SmsTrackerPlugin>('SmsTracker');

  // #region Public Methods

  /** Starts sending the phone's bank SMS, once per page load, after SnapTracker loaded its data. */
  start(): void {
    if (!this.sms || this.started)
      return;
    this.started = true;
    void this.sms.addListener('smsReceived', () => void this.sync());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible')
        void this.sync();
    });
    void this.sync();
  }

  /** Sends the bank SMS the phone caught since the last time. Nothing happens unless tracking is on both in the account and on the phone. */
  async sync(): Promise<void> {
    const tracking = this.state.data()?.tracking;
    if (!this.sms || tracking?.state !== 'enabled')
      return;
    if (this.busy) {
      this.again = true;
      return;
    }
    this.busy = true;
    try {
      if ((await this.sms.getStatus()).enabled)
        await this.send(this.sms, tracking.since ? Date.parse(tracking.since) : Date.now());
    } catch {
      // What was not sent stays on the phone (the queue and the inbox position move only after an upload), so the next sync sends it.
    } finally {
      this.busy = false;
    }
    if (this.again) {
      this.again = false;
      await this.sync();
    }
  }

  /** Turns tracking on, pauses, resumes or turns it off: on the phone first (the notice and Android's popup), then in the account. A refusal changes nothing. */
  async tracking(action: TrackerTrackingAction): Promise<void> {
    if (this.sms && !(await this.phone(this.sms, action)))
      return;
    if ((await this.state.run(() => this.state.api.tracking(action))) && (action === 'enable' || action === 'resume'))
      await this.sync();
  }

  // #endregion

  // #region Private Methods

  /** Sends messages in batches of the import size; resolves how many became new transactions. */
  private async upload(messages: NativeSms[]): Promise<number> {
    let added = 0;
    for (let done = 0; done < messages.length; done += TRACKER_IMPORT_BATCH) {
      const batch: TrackerImportSms[] = messages.slice(done, done + TRACKER_IMPORT_BATCH).map((m) => ({ body: m.body, sender: m.sender, receivedAt: new Date(m.receivedAt).toISOString() }));
      const res = await this.state.api.importSms(batch);
      this.state.data.set(res.state);
      added += res.result.created;
    }
    return added;
  }

  /** The inbox since `since` (ms), then the new SMS the phone queued; each part is marked as sent on the phone only after its upload worked. */
  private async send(sms: SmsTrackerPlugin, since: number): Promise<void> {
    let added = 0;
    let more = true;
    while (more) {
      const inbox = await sms.readInbox({ since });
      added += await this.upload(inbox.messages);
      await sms.markInbox({ until: inbox.until });
      more = inbox.more;
    }
    const queued = (await sms.getPending()).messages;
    added += await this.upload(queued);
    if (queued.length)
      await sms.acknowledge({ ids: queued.map((m) => m.id ?? '') });
    if (added)
      this.state.toast(this.i18n.t('tracker.phone.synced', { count: added }));
  }

  /** The phone's part of a tracking change; resolves false (with a toast) when the user did not allow SMS access. */
  private async phone(sms: SmsTrackerPlugin, action: TrackerTrackingAction): Promise<boolean> {
    try {
      const status = await sms[action]();
      if (status.enabled || action === 'pause' || action === 'revoke')
        return true;
    } catch {
      // Treated as not allowed.
    }
    this.state.toast(this.i18n.t('tracker.phone.denied'), true);
    return false;
  }

  // #endregion
}
