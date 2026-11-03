import { KhataUiService } from '../../../../core/khata-ui.service';
import { Component, computed, effect, inject, input, signal } from '@angular/core';

/**
 * Round badge of a party: their profile picture when they have one, else initials in one of six colours picked from the name (so a party always
 * gets the same one). `<span kAvatar [name]="c.name" [contactId]="c.id" [photo]="c.photo"></span>`
 */
@Component({
  selector: 'span[kAvatar]',
  templateUrl: './khata-avatar.html',
  host: { 'aria-hidden': 'true', '[class]': 'classes()' },
})

export class KhataAvatar {
  readonly contactId = input(0);
  readonly size = input<'' | 'lg'>('');
  readonly name = input.required<string>();
  private readonly ui = inject(KhataUiService);
  protected readonly url = signal<string | null>(null);
  /** The picture's version from the contact (null = no picture). */
  readonly photo = input<string | null | undefined>(null);
  protected readonly initials = computed(() => {
    const words = this.name().trim().split(/\s+/);
    return ((words[0] ?? '')[0] ?? '?') + (words.length > 1 ? words[words.length - 1][0] : '');
  });
  protected readonly classes = computed(() => {
    let h = 0;
    for (const ch of this.name())
      h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return `k-av a${(h % 6) + 1}${this.size() ? ' ' + this.size() : ''}${this.url() ? ' has-photo' : ''}`;
  });

  constructor() {
    effect(() => {
      const id = this.contactId();
      const version = this.photo();
      this.url.set(null);
      if (id && version)
        void this.ui.contactPhotoUrl(id, version).then((url) => this.contactId() === id && this.photo() === version && this.url.set(url));
    });
  }
}
