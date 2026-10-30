import { Injectable, signal } from '@angular/core';
import { KhataPinRequest } from './models/khata.model';

/**
 * Asks for the PIN before a risky action (edit or delete an entry, delete a contact or book, allow a contact to add entries).
 * `ask` opens the PIN sheet and resolves with a single-use proof for that one action, or null when the sheet is closed.
 */
@Injectable({ providedIn: 'root' })

export class KhataPinPromptService {
  readonly request = signal<KhataPinRequest | null>(null);
  private resolver: ((proof: string | null) => void) | null = null;

  // #region Public Methods

  finish(proof: string | null): void {
    this.resolver?.(proof);
    this.resolver = null;
    this.request.set(null);
  }

  ask(request: KhataPinRequest): Promise<string | null> {
    this.finish(null);
    this.request.set(request);
    return new Promise((resolve) => (this.resolver = resolve));
  }

  // #endregion
}
