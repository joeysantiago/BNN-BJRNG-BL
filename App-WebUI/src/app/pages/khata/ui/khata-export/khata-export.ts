import { KhataIcon } from '../khata-icon/khata-icon';
import { todayIso } from '../../../../core/khata-format';
import { I18nService } from '../../../../core/i18n.service';
import { Component, inject, input, signal } from '@angular/core';
import { KhataApiService } from '../../../../core/khata-api.service';
import { KhataEntryQuery, KhataExportFormat, KhataIconName } from '../../../../core/models/khata.model';

const EXTENSIONS: Record<KhataExportFormat, string> = { pdf: 'pdf', xlsx: 'xlsx', csv: 'csv' };

const ICONS: Record<KhataExportFormat, KhataIconName> = { pdf: 'filePdf', xlsx: 'fileSheet', csv: 'fileCsv' };

/**
 * Export of a list screen: one download icon; hovering it (or tapping it on a phone) slides out PDF, Excel and CSV, and a click on one downloads.
 * Each icon is named in its tooltip and for screen readers.
 * The API builds the file from the same filters as the screen (every page), so one component serves any list:
 * `<app-khata-export path="/khata/books/1/transactions" [query]="query()" fileName="entries" />`.
 */
@Component({
  selector: 'app-khata-export',
  imports: [KhataIcon],
  templateUrl: './khata-export.html',
  host: { '(document:click)': 'outside($event)', '(document:keydown.escape)': 'open.set(false)' },
})

export class KhataExport {
  protected readonly icons = ICONS;
  /** Off while the screen is busy with something else, such as the add-party form. */
  readonly disabled = input(false);
  protected readonly error = signal('');
  protected readonly open = signal(false);
  readonly path = input.required<string>();
  readonly fileName = input.required<string>();
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(KhataApiService);
  readonly query = input<KhataEntryQuery | undefined>(undefined);
  protected readonly busy = signal<KhataExportFormat | null>(null);
  protected readonly formats: KhataExportFormat[] = ['pdf', 'xlsx', 'csv'];

  // #region Public Methods

  toggle(): void {
    if (!this.disabled())
      this.open.update((v) => !v);
  }

  /** A tap outside closes the choices again. */
  outside(ev: MouseEvent): void {
    if (this.open() && !(ev.target as Element | null)?.closest('app-khata-export'))
      this.open.set(false);
  }

  /** Downloads the file; the name carries today's date, e.g. entries-2026-03-05.pdf. */
  async download(format: KhataExportFormat): Promise<void> {
    if (this.busy() || this.disabled())
      return;
    this.busy.set(format);
    this.error.set('');
    try {
      const blob = await this.api.exportFile(this.path(), format, this.query());
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${this.fileName()}-${todayIso()}.${EXTENSIONS[format]}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      this.open.set(false);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(null);
    }
  }

  // #endregion
}
