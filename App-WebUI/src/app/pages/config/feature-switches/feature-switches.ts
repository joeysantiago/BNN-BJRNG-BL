import { SaveNotice } from '../config.model';
import { AuthService } from '../../../core/auth.service';
import { I18nService } from '../../../core/i18n.service';
import { SettingsService } from '../../../core/settings.service';
import { Component, computed, inject, input, signal } from '@angular/core';
import { FeatureId, FeatureInfo, SettingsSection } from '../../../core/models/app-settings.model';

/**
 * A list of site switches with its own Save button (Settings > Features for one group, Settings > General for one app). Each switch is saved as soon as it
 * is changed; Save writes the unsaved edits of their groups again after a failed save. Needs the Edit right of Site options; with View only, the switches are read-only.
 */
@Component({
  selector: 'app-feature-switches',
  templateUrl: './feature-switches.html',
  styleUrl: './feature-switches.scss',
})

export class FeatureSwitches {
  readonly help = input('');
  protected readonly saving = signal(false);
  readonly heading = input.required<string>();
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  readonly headingId = input.required<string>();
  protected readonly cfg = inject(SettingsService);
  readonly items = input.required<FeatureInfo[]>();
  protected readonly notice = signal<SaveNotice | null>(null);
  protected readonly canEdit = computed(() => this.auth.can('settings.features', 'edit'));
  /** The settings sections the switches belong to: Save writes the unsaved edits of these. */
  protected readonly sections = computed<SettingsSection[]>(() => [...new Set(this.items().map((f) => f.group))]);

  // #region Public Methods

  pending(): number {
    return this.cfg.pending(this.sections());
  }

  state(on: boolean): string {
    return this.i18n.t(on ? 'cfg.on' : 'cfg.off');
  }

  /** The server checks the right again; the page only shows what it answers. */
  async save(): Promise<void> {
    this.saving.set(true);
    this.notice.set(null);
    try {
      const text = await this.cfg.save(this.sections());
      this.notice.set({ text: text || this.i18n.t('cfg.save.nothing'), error: false, section: this.sections()[0] });
    } catch (e) {
      this.notice.set({ text: (e as { status?: number }).status !== undefined ? (e as Error).message : this.i18n.t('yt.serverdown'), error: true, section: this.sections()[0] });
    } finally {
      this.saving.set(false);
    }
  }

  /** A switch is saved at once, so it keeps its value after a reload or the next login. Save stays to try again after a failed save. */
  async toggle(id: FeatureId, ev: Event): Promise<void> {
    this.cfg.setFeature(id, (ev.target as HTMLInputElement).checked);
    await this.save();
  }

  // #endregion
}
