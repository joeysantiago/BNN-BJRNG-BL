import { ApiService } from './api.service';
import { Injectable, inject } from '@angular/core';
import { LookupItem } from './models/lookup.model';

/**
 * The address choices of the Profile page, from the Countries, States and Cities master tables (GET /lookups/...): countries, the states of a country, the
 * cities of a state. Each list is asked for once per page load and kept, so going back and forth between choices does not ask again.
 */
@Injectable({ providedIn: 'root' })

export class LookupService {
  private readonly api = inject(ApiService);
  private readonly lists = new Map<string, Promise<LookupItem[]>>();

  // #region Public Methods

  countries(): Promise<LookupItem[]> {
    return this.list('/lookups/countries');
  }

  cities(stateId: number): Promise<LookupItem[]> {
    return this.list(`/lookups/states/${stateId}/cities`);
  }

  states(countryId: number): Promise<LookupItem[]> {
    return this.list(`/lookups/countries/${countryId}/states`);
  }

  // #endregion

  // #region Private Methods

  /** A failed list is not kept, so the next time it is asked for again. */
  private list(path: string): Promise<LookupItem[]> {
    let list = this.lists.get(path);
    if (!list) {
      list = this.api.get<LookupItem[]>(path);
      this.lists.set(path, list);
      list.catch(() => this.lists.delete(path));
    }
    return list;
  }

  // #endregion
}
