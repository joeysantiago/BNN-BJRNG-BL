import { RouterLink } from '@angular/router';
import { KhataIcon } from '../khata-icon/khata-icon';
import { KhataMoneyPipe } from '../khata-money.pipe';
import { formatDate } from '../../../../core/khata-format';
import { I18nService } from '../../../../core/i18n.service';
import { Component, computed, inject, input } from '@angular/core';
import { KHATA_GAVE, KhataCurrency, KhataEntry } from '../../../../core/models/khata.model';

/**
 * One entry in a list (dashboard, party ledger, all entries), linking to its details. `party` shows the party's name as the title;
 * `running` shows the party's balance after the entry instead of the entry type.
 */
@Component({
  selector: 'li[kTxRow]',
  templateUrl: './khata-tx-row.html',
  imports: [RouterLink, KhataIcon, KhataMoneyPipe],
})

export class KhataTxRow {
  readonly party = input(false);
  readonly running = input(false);
  readonly bookId = input.required<number>();
  protected readonly i18n = inject(I18nService);
  readonly kTxRow = input.required<KhataEntry>();
  readonly currency = input.required<KhataCurrency>();
  protected readonly gave = computed(() => this.kTxRow().entryType === KHATA_GAVE);
  protected readonly sub = computed(() => {
    const e = this.kTxRow();
    return [this.party() && e.contactName && e.note ? e.note : '', formatDate(e.entryDate)].filter(Boolean).join(' · ');
  });
  protected readonly title = computed(() => {
    const e = this.kTxRow();
    if (this.party() && e.contactName)
      return e.contactName;
    return e.note || this.i18n.t(this.gave() ? 'khata.e.gave' : 'khata.e.got');
  });
}
