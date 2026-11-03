import { KhataIcon } from '../khata-icon/khata-icon';
import { todayIso } from '../../../../core/khata-format';
import { I18nService } from '../../../../core/i18n.service';
import { Component, OnDestroy, inject, input, model } from '@angular/core';
import { KhataEntryKind, KhataEntryQuery, KhataEntrySort } from '../../../../core/models/khata.model';

const SEARCH_DELAY_MS = 300;

/** Search, sort and filter chips of an entry list. Every change starts again at page 1. `withParty` adds the date range and searches party names too. */
@Component({
  selector: 'app-khata-entry-toolbar',
  imports: [KhataIcon],
  templateUrl: './khata-entry-toolbar.html',
})

export class KhataEntryToolbar implements OnDestroy {
  readonly withParty = input(false);
  protected readonly today = todayIso();
  protected readonly i18n = inject(I18nService);
  readonly query = model.required<KhataEntryQuery>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  protected readonly sorts: KhataEntrySort[] = ['newest', 'oldest', 'high', 'low'];
  protected readonly kinds: KhataEntryKind[] = ['all', 'gave', 'got', 'photos', 'deleted'];

  // #region Public Methods

  clear(): void {
    this.query.set({ ...this.query(), q: '', kind: 'all', from: '', to: '', page: 1 });
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
  }

  search(text: string): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.set({ q: text }), SEARCH_DELAY_MS);
  }

  kindLabel(kind: KhataEntryKind): string {
    return this.i18n.t({ all: 'khata.f.all', gave: 'khata.e.gave', got: 'khata.e.got', photos: 'khata.f.photos', deleted: 'khata.e.deleted' }[kind]);
  }

  set(change: Partial<KhataEntryQuery>): void {
    this.query.set({ ...this.query(), ...change, page: 1 });
  }

  // #endregion
}
