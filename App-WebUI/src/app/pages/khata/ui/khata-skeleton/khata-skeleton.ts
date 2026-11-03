import { Component, inject, input } from '@angular/core';
import { I18nService } from '../../../../core/i18n.service';

/** Grey shapes in the layout of the screen that is loading, so nothing jumps when the data arrives. */
@Component({
  selector: 'app-khata-skeleton',
  templateUrl: './khata-skeleton.html',
})

export class KhataSkeleton {
  readonly stats = [0, 1, 2, 3];
  readonly rows = [0, 1, 2, 3, 4, 5];
  protected readonly i18n = inject(I18nService);
  readonly kind = input<'dash' | 'list'>('list');
}
