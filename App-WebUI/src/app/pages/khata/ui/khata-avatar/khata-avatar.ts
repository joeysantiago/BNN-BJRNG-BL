import { Component, computed, input } from '@angular/core';

/** Round initials badge in one of six colours, picked from the name so a party always gets the same one. `<span kAvatar [name]="c.name"></span>` */
@Component({
  selector: 'span[kAvatar]',
  templateUrl: './khata-avatar.html',
  host: { 'aria-hidden': 'true', '[class]': 'classes()' },
})

export class KhataAvatar {
  readonly size = input<'' | 'lg'>('');
  readonly name = input.required<string>();
  protected readonly initials = computed(() => {
    const words = this.name().trim().split(/\s+/);
    return ((words[0] ?? '')[0] ?? '?') + (words.length > 1 ? words[words.length - 1][0] : '');
  });
  protected readonly classes = computed(() => {
    let h = 0;
    for (const ch of this.name())
      h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return `k-av a${(h % 6) + 1}${this.size() ? ' ' + this.size() : ''}`;
  });
}
