import { RouterLink } from '@angular/router';
import { I18nService } from '../../../core/i18n.service';
import { ChoiceGroup } from '../../../shared/choice-group';
import { TRACKER_ALERT_TYPES } from '../../../core/tracker-meta';
import { ChoiceOption } from '../../../shared/models/choice.model';
import { TrackerApiService } from '../../../core/tracker-api.service';
import { TrackerStateService } from '../../../core/tracker-state.service';
import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { TrackerAlertType, TrackerNotice, TrackerSettings } from '../../../core/models/tracker.model';

/**
 * SnapTracker's part of Settings > General (FEATURE_SETTINGS), for a user who may open SnapTracker: what happens to a new SMS transaction (review
 * everything, smart, approve all, and how sure "smart" must be) and which alerts arrive. Each change saves at once (PUT /tracker/settings).
 * The link to SnapKhata (post confirmed transactions to a Khata book) comes in phase 3 of the plan.
 */
@Component({
  selector: 'app-tracker-settings-panel',
  imports: [RouterLink, ChoiceGroup],
  templateUrl: './tracker-settings-panel.html',
  styleUrl: './tracker-settings-panel.scss',
})

export class TrackerSettingsPanel {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(TrackerApiService);
  protected readonly alertTypes = TRACKER_ALERT_TYPES;
  private readonly state = inject(TrackerStateService);
  protected readonly thresholds = [60, 70, 75, 80, 85, 90, 95];
  protected readonly notice = signal<TrackerNotice | null>(null);
  protected readonly settings = signal<TrackerSettings | null>(null);
  protected readonly appName = computed(() => this.i18n.page('tracker'));
  protected readonly approvals = computed<ChoiceOption[]>(() => ['review', 'smart', 'auto'].map((v) => ({ value: v, label: this.i18n.t('tracker.set.approval.' + v) })));

  constructor() {
    afterNextRender(() => void this.load());
  }

  // #region Public Methods

  /** Switches one alert type on or off. */
  alert(type: TrackerAlertType, on: boolean): void {
    const s = this.settings();
    if (s)
      void this.set('alerts', { ...s.alerts, [type]: on });
  }

  async set<K extends keyof TrackerSettings>(key: K, value: TrackerSettings[K]): Promise<void> {
    const current = this.settings();
    if (!current)
      return;
    this.notice.set(null);
    try {
      const res = await this.api.saveSettings({ ...current, [key]: value });
      this.settings.set(res.data.settings);
      this.state.data.set(res.data);
      this.notice.set({ text: res.text, error: false });
    } catch (e) {
      this.notice.set({ text: (e as Error).message, error: true });
    }
  }

  // #endregion

  // #region Private Methods

  private async load(): Promise<void> {
    try {
      this.settings.set((await this.api.state()).settings);
    } catch (e) {
      this.notice.set({ text: (e as Error).message, error: true });
    }
  }

  // #endregion
}
