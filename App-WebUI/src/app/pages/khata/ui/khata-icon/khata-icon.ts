import { Component, computed, input } from '@angular/core';
import { KhataIconName } from '../../../../core/models/khata.model';
import { KHATA_FLIP_ICONS, KHATA_ICONS } from '../../../../core/khata-icons';

/** A SnapKhata line icon, placed on an <svg>: `<svg kIco="plus" [size]="18"></svg>`. Decorative: the text next to it names the action. */
@Component({
  selector: 'svg[kIco]',
  templateUrl: './khata-icon.html',
  host: {
    class: 'k-ico',
    fill: 'none',
    viewBox: '0 0 24 24',
    'aria-hidden': 'true',
    stroke: 'currentColor',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    '[attr.width]': 'size()',
    '[attr.height]': 'size()',
    '[class.k-flip]': 'flip()',
    '[attr.stroke-width]': 'stroke()',
  },
})

export class KhataIcon {
  readonly size = input(20);
  readonly stroke = input(2);
  readonly kIco = input.required<KhataIconName>();
  protected readonly shapes = computed(() => KHATA_ICONS[this.kIco()]);
  protected readonly flip = computed(() => KHATA_FLIP_ICONS.includes(this.kIco()));
}
