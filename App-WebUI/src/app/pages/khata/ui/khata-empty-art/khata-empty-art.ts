import { KHATA_ICONS } from '../../../../core/khata-icons';
import { Component, computed, input } from '@angular/core';
import { KhataIconName } from '../../../../core/models/khata.model';

/** Small line drawing for empty and not-found states, coloured by the theme. `<svg kEmptyArt="users"></svg>` */
@Component({
  selector: 'svg[kEmptyArt]',
  templateUrl: './khata-empty-art.html',
  host: { class: 'art', viewBox: '0 0 140 110', 'aria-hidden': 'true' },
})

export class KhataEmptyArt {
  readonly kEmptyArt = input.required<KhataIconName>();
  protected readonly shapes = computed(() => KHATA_ICONS[this.kEmptyArt()]);
}
