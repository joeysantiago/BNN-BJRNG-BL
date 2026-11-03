import { KhataIcon } from '../khata-icon/khata-icon';
import { I18nService } from '../../../../core/i18n.service';
import { Component, computed, inject, input } from '@angular/core';

/** Balance status of a party: to collect, to pay, settled, or no entries yet. `<span kStatus [balance]="bal" [hasEntries]="true"></span>` */
@Component({
  selector: 'span[kStatus]',
  imports: [KhataIcon],
  templateUrl: './khata-status.html',
  host: { '[class]': 'classes()' },
})

export class KhataStatus {
  readonly hasEntries = input(false);
  readonly balance = input.required<number>();
  protected readonly i18n = inject(I18nService);
  protected readonly classes = computed(() => (this.balance() ? 'k-badge warn' : this.hasEntries() ? 'k-badge get' : 'k-badge'));
}
