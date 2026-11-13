import { AuthService } from '../../../../core/auth.service';
import { I18nService } from '../../../../core/i18n.service';
import { TrackerStateService } from '../../../../core/tracker-state.service';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';

/**
 * "My details": the names banks write for the user ("Kunal Kumar") and their mobile numbers, so money between their own accounts is a self transfer and
 * not spending or income (PUT /tracker/details; every transaction is worked out again). Shown once when SnapTracker opens (the shell) and kept in the
 * Profile page's SnapTracker part. The name starts as the account's name; several names or mobiles are separated by commas.
 */
@Component({
  selector: 'app-tracker-details',
  templateUrl: './tracker-details.html',
  styleUrl: './tracker-details.scss',
})

export class TrackerDetails {
  readonly done = output<void>();
  /** Shown as a first-time prompt (with "Later"), or as a part of the Profile page. */
  readonly prompt = input(false);
  protected readonly names = signal('');
  protected readonly mobiles = signal('');
  private readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  protected readonly state = inject(TrackerStateService);
  private readonly owner = computed(() => this.state.data()?.owner ?? null);

  constructor() {
    // The saved details, or the account's name the first time.
    effect(() => {
      const owner = this.owner();
      if (!owner)
        return;
      this.names.set(owner.names.length ? owner.names.join(', ') : (this.auth.user()?.displayName ?? ''));
      this.mobiles.set(owner.mobiles.join(', '));
    });
  }

  // #region Public Methods

  async save(): Promise<void> {
    const split = (text: string) => text.split(',').map((v) => v.trim()).filter((v) => v.length > 0);
    if (await this.state.run(() => this.state.api.saveDetails({ names: split(this.names()), mobiles: split(this.mobiles()) })))
      this.done.emit();
  }

  // #endregion
}
