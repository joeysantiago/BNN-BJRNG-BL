import { I18nService } from '../../../../core/i18n.service';
import { Component, computed, inject, input, signal } from '@angular/core';
import { TRACKER_SENDERS, trackerBank } from '../../../../core/tracker-meta';

/**
 * The logo of a bank or payment app by its SMS sender code: `<app-tracker-bank [code]="txn.bankCode" [size]="16" />`. Its width and height are set, so
 * nothing moves when it loads; a bank without a logo file, or one whose file does not load, shows a badge with its short name on its brand colour.
 * An unknown or empty code shows nothing.
 */
@Component({
  selector: 'app-tracker-bank',
  templateUrl: './tracker-bank.html',
  styleUrl: './tracker-bank.scss',
  host: { class: 'bk', '[hidden]': '!bank()', '[style.--bk-size]': 'size() + "px"' },
})

export class TrackerBank {
  readonly size = input(20);
  readonly code = input<string | null>(null);
  protected readonly i18n = inject(I18nService);
  protected readonly failed = signal<string | null>(null);
  protected readonly bank = computed(() => trackerBank(this.code()));
  /** The logo file, or null for the badge (no file, or it did not load). */
  protected readonly src = computed(() => {
    const logo = this.bank()?.logo;
    const src = logo ? `/banks/${logo}` : null;
    return src === this.failed() ? null : src;
  });
  /** "HDFC Bank logo", with the bank's full name. */
  protected readonly alt = computed(() => {
    const code = this.code()?.toUpperCase().split('-').pop() ?? '';
    return this.i18n.t('tracker.bank.logo', { name: TRACKER_SENDERS[code] ?? this.bank()?.short ?? code });
  });
}
