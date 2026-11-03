import { Lang } from '../../../core/site';
import { Pipe, PipeTransform } from '@angular/core';
import { formatMoney } from '../../../core/khata-format';
import { KhataCurrency } from '../../../core/models/khata.model';

/** `{{ minor | kMoney: currency : i18n.lang() }}` → "₹1,500.00". The language is an argument so the text follows a language switch. */
@Pipe({ name: 'kMoney' })

export class KhataMoneyPipe implements PipeTransform {
  // #region Public Methods

  transform(minor: number | null | undefined, currency: KhataCurrency | null | undefined, lang: Lang): string {
    return currency && minor !== null && minor !== undefined ? formatMoney(minor, currency, lang) : '';
  }

  // #endregion
}
