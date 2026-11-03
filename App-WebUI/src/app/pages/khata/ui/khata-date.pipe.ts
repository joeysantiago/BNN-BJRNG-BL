import { Pipe, PipeTransform } from '@angular/core';
import { formatDate } from '../../../core/khata-format';

/** `{{ entry.entryDate | kDate }}` → "05-03-2026" (App-Document/date-format.md). */
@Pipe({ name: 'kDate' })

export class KhataDatePipe implements PipeTransform {
  // #region Public Methods

  transform(iso: string | null | undefined): string {
    return formatDate(iso);
  }

  // #endregion
}
