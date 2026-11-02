import { AuthService } from '../core/auth.service';
import { AuthUser } from '../core/models/auth.model';
import { Component, computed, inject, input } from '@angular/core';

/**
 * A round profile picture: the user's uploaded picture, or their initials when they have none (or the picture fails to load).
 * Decorative by default (the name is shown next to it); pass `label` when the picture stands alone.
 */
@Component({
  selector: 'app-user-avatar',
  templateUrl: './user-avatar.html',
  styleUrl: './user-avatar.scss',
  host: { '[style.--size.px]': 'size()' },
})

export class UserAvatar {
  readonly size = input(32);
  private readonly auth = inject(AuthService);
  readonly label = input<string | null>(null);
  readonly user = input.required<AuthUser | null>();
  protected readonly url = computed(() => this.auth.avatarUrl(this.user()));
  /** Up to two initials of the display name (or of the e-mail when there is no name). */
  protected readonly initials = computed(() => ((this.user()?.displayName || this.user()?.email || '?').trim().split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('')) || '?');
}
