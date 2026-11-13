import { I18nService } from '../../../core/i18n.service';
import { TrackerNotice } from '../../../core/models/tracker.model';
import { TrackerApiService } from '../../../core/tracker-api.service';
import { TrackerDetails } from '../ui/tracker-details/tracker-details';
import { TrackerStateService } from '../../../core/tracker-state.service';
import { Component, afterNextRender, computed, inject, signal } from '@angular/core';

/**
 * SnapTracker's part of the Profile page (FEATURE_PROFILE): "My details" (the names and mobiles that make a transfer between your own accounts a self transfer)
 * and your data in SnapTracker. Download it all (JSON), delete the original SMS texts but keep the transactions, or delete everything SnapTracker keeps for you. Each delete asks again before it runs. The account, its login and the other apps stay.
 */
@Component({
  selector: 'app-tracker-profile-panel',
  imports: [TrackerDetails],
  templateUrl: './tracker-profile-panel.html',
  styleUrl: './tracker-profile-panel.scss',
})

export class TrackerProfilePanel {
  protected readonly busy = signal(false);
  protected readonly withText = signal(0);
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(TrackerApiService);
  private readonly state = inject(TrackerStateService);
  protected readonly notice = signal<TrackerNotice | null>(null);
  protected readonly sure = signal<'texts' | 'all' | null>(null);
  protected readonly appName = computed(() => this.i18n.page('tracker'));

  constructor() {
    afterNextRender(() => void this.load());
  }

  // #region Public Methods

  /** Saves everything SnapTracker keeps for this account as a JSON file. */
  async download(): Promise<void> {
    await this.work(async () => {
      const data = await this.api.exportData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `snaptracker-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return '';
    });
  }

  /** The first press asks again; the second deletes. */
  async remove(what: 'texts' | 'all'): Promise<void> {
    if (this.sure() !== what) {
      this.sure.set(what);
      return;
    }
    this.sure.set(null);
    await this.work(async () => {
      const res = what === 'texts' ? await this.api.deleteSmsTexts() : await this.api.deleteAll();
      this.state.data.set(res.data);
      this.withText.set(res.data.txns.filter((t) => t.sms).length);
      return res.text;
    });
  }

  // #endregion

  // #region Private Methods

  private async load(): Promise<void> {
    try {
      const data = await this.api.state();
      this.state.data.set(data);
      this.withText.set(data.txns.filter((t) => t.sms).length);
    } catch (e) {
      this.notice.set({ text: (e as Error).message, error: true });
    }
  }

  private async work(job: () => Promise<string>): Promise<void> {
    this.busy.set(true);
    this.notice.set(null);
    try {
      const text = await job();
      if (text)
        this.notice.set({ text, error: false });
    } catch (e) {
      this.notice.set({ text: (e as Error).message, error: true });
    } finally {
      this.busy.set(false);
    }
  }

  // #endregion
}
