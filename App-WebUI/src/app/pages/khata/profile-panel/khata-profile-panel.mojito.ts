import { Component, inject } from '@angular/core';
import { KHATA_TEXTS } from '../../../i18n/khata';
import { KhataProfilePanel } from './khata-profile-panel';
import { I18nService } from '../../../core/i18n.service';

/**
 * SnapKhata's part of the Profile page in Mojito: the same panel as the API branches, after adding SnapKhata's texts (i18n/khata.ts). The API branches load
 * every text from the Translations table; Mojito adds SnapKhata's only when one of its screens opens, and the Profile page is not one of them.
 */
@Component({
  selector: 'app-khata-profile-panel-mojito',
  imports: [KhataProfilePanel],
  template: '<app-khata-profile-panel />',
})

export class KhataProfilePanelMojito {
  constructor() {
    inject(I18nService).extend(KHATA_TEXTS);
  }
}
