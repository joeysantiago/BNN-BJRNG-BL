import { Injectable, signal } from '@angular/core';
import { Toast, ToastLink } from './models/toast.model';

/** How long a toast stays, in milliseconds; one with a link stays longer, so there is time to use it. */
const SHOW_MS = 6000;
const LINK_MS = 10000;

/**
 * The site's toasts (shared/site-toasts shows them at the bottom of every page): short messages such as the server's answer, optionally with a link.
 * A toast closes by itself after a few seconds, or with its close button.
 */
@Injectable({ providedIn: 'root' })

export class ToastService {
  private nextId = 1;
  readonly toasts = signal<Toast[]>([]);

  // #region Public Methods

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  show(text: string, error = false, link?: ToastLink): void {
    const id = this.nextId++;
    this.toasts.update((list) => [...list, { id, text, error, link }]);
    setTimeout(() => this.dismiss(id), link ? LINK_MS : SHOW_MS);
  }

  // #endregion
}
