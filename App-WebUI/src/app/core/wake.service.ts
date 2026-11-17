import { ApiService } from './api.service';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';

const WAKE_TIMEOUT = environment.timings.apiWakeMs;

/**
 * Wakes a sleeping API and its database (GET /health/wake reads one row): called as soon as the site opens and again on the login page, so they are
 * awake by the time the visitor needs them. Nobody waits for the answer.
 */
@Injectable({ providedIn: 'root' })

export class WakeService {
  private readonly api = inject(ApiService);
  private pending: Promise<void> | null = null;

  // #region Public Methods

  /** One call at a time: a call made while one is running joins it. Never throws. */
  wake(): Promise<void> {
    return (this.pending ??= this.api.get<boolean>('/health/wake', WAKE_TIMEOUT).then(() => undefined, () => undefined).finally(() => (this.pending = null)));
  }

  // #endregion
}
