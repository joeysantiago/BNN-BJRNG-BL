import { Component, inject } from '@angular/core';
import { KHATA_TEXTS } from '../../../i18n/khata';
import { I18nService } from '../../../core/i18n.service';
import { KhataSettingsPanel } from './khata-settings-panel';

/**
 * SnapKhata's part of Settings > General in Mojito: the same panel as the API branches, after adding SnapKhata's texts (i18n/khata.ts). The API branches load
 * every text from the Translations table; Mojito adds SnapKhata's only when one of its screens opens, and the Settings page is not one of them.
 */
@Component({
  selector: 'app-khata-settings-panel-mojito',
  imports: [KhataSettingsPanel],
  template: '<app-khata-settings-panel />',
})

export class KhataSettingsPanelMojito {
  constructor() {
    inject(I18nService).extend(KHATA_TEXTS);
  }
}
