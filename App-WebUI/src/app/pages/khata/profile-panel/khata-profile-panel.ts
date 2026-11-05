import { AuthService } from '../../../core/auth.service';
import { I18nService } from '../../../core/i18n.service';
import { DetailField } from '../../profile/profile.model';
import { KhataNotice } from '../../../core/models/khata.model';
import { ProfileDetails } from '../../../core/models/auth.model';
import { Component, afterNextRender, inject, signal } from '@angular/core';

/** The company fields, in the order of the form. */
const COMPANY: DetailField[] = [
  { name: 'companyName', label: 'auth.p.companyName', type: 'text', autocomplete: 'organization', limit: 'companyNameLength' },
  { name: 'companyTaxId', label: 'auth.p.companyTaxId', type: 'text', autocomplete: 'off', limit: 'companyTaxIdLength' },
  { name: 'companyEmail', label: 'auth.p.companyEmail', type: 'email', autocomplete: 'off', limit: 'companyEmailLength' },
  { name: 'companyPhone', label: 'auth.p.companyPhone', type: 'tel', autocomplete: 'off', limit: 'companyPhoneLength' },
  { name: 'companyAddress', label: 'auth.p.companyAddress', type: 'text', autocomplete: 'off', limit: 'companyAddressLength' },
];

/**
 * SnapKhata's part of the Profile page (FEATURE_PROFILE), for a user who may open SnapKhata: the company shown on the PDFs they export. It is saved with the rest of
 * the profile details (GET/PUT /auth/me/details); the mobile number and address there stay as they are.
 */
@Component({
  selector: 'app-khata-profile-panel',
  templateUrl: './khata-profile-panel.html',
  styleUrl: './khata-profile-panel.scss',
})

export class KhataProfilePanel {
  protected readonly fields = COMPANY;
  protected readonly busy = signal(false);
  private readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  protected readonly notice = signal<KhataNotice | null>(null);
  protected readonly details = signal<ProfileDetails | null>(null);

  constructor() {
    afterNextRender(() => void this.load());
  }

  // #region Public Methods

  /** An empty field is cleared. */
  async save(ev: Event): Promise<void> {
    ev.preventDefault();
    const current = this.details();
    if (!current || this.busy())
      return;
    const data = new FormData(ev.target as HTMLFormElement);
    const company = Object.fromEntries(COMPANY.map((f) => [f.name, String(data.get(f.name) ?? '').trim() || null]));
    const details = { ...current, ...company } as ProfileDetails;
    this.busy.set(true);
    this.notice.set(null);
    try {
      this.notice.set({ text: await this.auth.saveDetails(details), error: false });
      this.details.set(details);
    } catch (e) {
      this.notice.set({ text: (e as Error).message, error: true });
    } finally {
      this.busy.set(false);
    }
  }

  // #endregion

  // #region Private Methods

  private async load(): Promise<void> {
    try {
      this.details.set(await this.auth.details());
    } catch (e) {
      this.notice.set({ text: (e as Error).message, error: true });
    }
  }

  // #endregion
}
