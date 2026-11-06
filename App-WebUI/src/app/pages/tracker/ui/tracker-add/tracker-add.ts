import { Component, inject, signal } from '@angular/core';
import { TrackerForm } from '../tracker-form/tracker-form';
import { TrackerIcon } from '../tracker-icon/tracker-icon';
import { I18nService } from '../../../../core/i18n.service';
import { trackerCategory } from '../../../../core/tracker-meta';
import { TrackerStateService } from '../../../../core/tracker-state.service';
import { TRACKER_IMPORT_BATCH, readSmsBackup } from '../../../../core/tracker-backup';
import { TrackerImportResult, TrackerSmsResult, TrackerStep, TrackerTxnRequest } from '../../../../core/models/tracker.model';

/**
 * The Add sheet (the + button): paste a bank or UPI SMS, type a transaction in, or import an SMS backup. A pasted SMS goes through the same reader as the Android app will
 * (POST /tracker/sms), and the sheet shows what happened at each step, so it is clear why a message was saved, caught as a duplicate or ignored.
 * Until the Android app exists, pasting (and, on Android, sharing an SMS to the installed app) is how SMS reach SnapTracker.
 * An import reads an SMS Backup & Restore file on the device and sends only its bank and UPI messages, in batches, each with the date it came.
 */
@Component({
  selector: 'app-tracker-add',
  imports: [TrackerIcon, TrackerForm],
  templateUrl: './tracker-add.html',
  styleUrl: './tracker-add.scss',
  host: { '(document:keydown.escape)': 'close()' },
})

export class TrackerAdd {
  protected readonly body = signal('');
  protected readonly note = signal('');
  protected readonly sender = signal('');
  protected readonly i18n = inject(I18nService);
  protected readonly state = inject(TrackerStateService);
  protected readonly result = signal<TrackerSmsResult | null>(null);
  protected readonly imported = signal<TrackerImportResult | null>(null);
  protected readonly tab = signal<'paste' | 'manual' | 'import'>('paste');
  protected readonly found = signal<{ total: number; bank: number } | null>(null);
  protected readonly progress = signal<{ done: number; total: number } | null>(null);

  // #region Public Methods

  close(): void {
    this.state.addOpen.set(false);
  }

  /** Starts again with an empty box. */
  again(): void {
    this.result.set(null);
    this.body.set('');
    this.sender.set('');
  }

  /** Opens the transaction the SMS made (or its duplicate) in the details drawer. */
  openTxn(id: number): void {
    this.close();
    this.state.open.set(id);
  }

  /** Reads the pasted SMS; a refusal (nothing pasted, too long) shows as a toast. */
  async read(): Promise<void> {
    this.state.busy.set(true);
    try {
      const res = await this.state.api.readSms(this.sender().trim(), this.body());
      this.state.data.set(res.state);
      this.result.set(res.result);
    } catch (e) {
      this.state.toast((e as Error).message, true);
    } finally {
      this.state.busy.set(false);
    }
  }

  /** The detail line of one step, in the user's language. */
  stepText(s: TrackerStep): string {
    const a = s.args;
    switch (s.key) {
      case 'sender':
        return s.ok ? `${a['name']} · ${this.i18n.t('tracker.kind.' + a['kind'])}` : this.i18n.t('tracker.step.sender.no', { sender: a['sender'] });
      case 'promo':
        return this.i18n.t(s.ok ? 'tracker.step.promo.ok' : a['why'] === 'header' ? 'tracker.step.promo.header' : 'tracker.step.promo.words');
      case 'details':
        return [this.state.money(+a['amount']), this.i18n.t(a['type'] ? 'tracker.form.' + a['type'] : 'tracker.step.typeUnclear'), this.i18n.t('tracker.method.' + a['method']), a['account'], a['ref'] ? this.i18n.t('tracker.step.ref', { ref: a['ref'] }) : ''].filter(Boolean).join(' · ');
      case 'category':
        return `${this.i18n.t('tracker.cat.' + trackerCategory(String(a['category'])).code)} · ${this.i18n.t('tracker.step.found.' + a['found'])}`;
      case 'duplicate':
        return s.ok ? this.i18n.t('tracker.step.duplicate.ok') : this.i18n.t('tracker.dup.' + a['why'], { ref: a['ref'] });
      case 'save':
        return this.i18n.t('tracker.step.save.' + a['status'], { n: a['confidence'] });
      default:
        return this.i18n.t(`tracker.step.${s.key}.${s.ok ? 'ok' : 'no'}`);
    }
  }

  async add(request: TrackerTxnRequest): Promise<void> {
    if (await this.state.run(() => this.state.api.add(request)))
      this.close();
  }

  /** Reads the chosen backup file on this device, then sends its bank and UPI messages in batches, oldest first; the counts add up as it goes. */
  async importFile(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file)
      return;
    this.note.set('');
    this.found.set(null);
    this.imported.set(null);
    this.state.busy.set(true);
    try {
      const backup = readSmsBackup(await file.text());
      if (!backup) {
        this.note.set(this.i18n.t('tracker.imp.bad'));
        return;
      }
      const total = backup.messages.length;
      const sum: TrackerImportResult = { already: 0, created: 0, skipped: 0, duplicates: 0 };
      this.found.set({ total: backup.total, bank: total });
      for (let done = 0; done < total; done += TRACKER_IMPORT_BATCH) {
        this.progress.set({ done, total });
        try {
          const res = await this.state.api.importSms(backup.messages.slice(done, done + TRACKER_IMPORT_BATCH));
          this.state.data.set(res.state);
          (Object.keys(sum) as (keyof TrackerImportResult)[]).forEach((k) => (sum[k] += res.result[k]));
          this.imported.set({ ...sum });
        } catch (e) {
          this.note.set(this.i18n.t('tracker.imp.stopped', { done, total }));
          this.state.toast((e as Error).message, true);
          return;
        }
      }
    } finally {
      this.progress.set(null);
      this.state.busy.set(false);
    }
  }

  // #endregion
}
