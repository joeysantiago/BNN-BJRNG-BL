import { Component, computed, input } from '@angular/core';
import { TrackerIconName } from '../../../../core/models/tracker.model';
import { TRACKER_FLIP_ICONS, TRACKER_ICONS } from '../../../../core/tracker-icons';

/** A SnapTracker line icon, placed on an <svg>: `<svg stIco="plus" [size]="18"></svg>`, drawn like SnapKhata's. Decorative: the text next to it names the action. */
@Component({
  selector: 'svg[stIco]',
  templateUrl: './tracker-icon.html',
  host: {
    class: 'ico',
    fill: 'none',
    viewBox: '0 0 24 24',
    'aria-hidden': 'true',
    stroke: 'currentColor',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    '[attr.width]': 'size()',
    '[attr.height]': 'size()',
    '[class.flip]': 'flip()',
    '[attr.stroke-width]': 'stroke()',
  },
})

export class TrackerIcon {
  readonly size = input(20);
  readonly stroke = input(2);
  readonly stIco = input.required<TrackerIconName>();
  protected readonly shapes = computed(() => TRACKER_ICONS[this.stIco()]);
  protected readonly flip = computed(() => TRACKER_FLIP_ICONS.includes(this.stIco()));
}
