import { DomSanitizer } from '@angular/platform-browser';
import { SETTINGS_ICONS } from '../core/settings-icons';
import { Component, computed, inject, input } from '@angular/core';

/** The icon of one Settings page tab. The drawings are fixed strings of core/settings-icons.ts, never user input. */
@Component({
  selector: 'app-settings-icon',
  templateUrl: './settings-icon.html',
  host: { style: 'display: contents' },
})

export class SettingsIcon {
  readonly size = input(18);
  readonly name = input.required<string>();
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly svg = computed(() => SETTINGS_ICONS[this.name()] ? this.sanitizer.bypassSecurityTrustHtml(SETTINGS_ICONS[this.name()]) : null);
}
