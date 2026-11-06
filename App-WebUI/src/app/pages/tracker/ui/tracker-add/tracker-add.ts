import { Component, inject, signal } from '@angular/core';
import { TrackerForm } from '../tracker-form/tracker-form';
import { TrackerIcon } from '../tracker-icon/tracker-icon';
import { I18nService } from '../../../../core/i18n.service';
import { trackerCategory } from '../../../../core/tracker-meta';
import { TrackerStateService } from '../../../../core/tracker-state.service';
import { TrackerSmsResult, TrackerStep, TrackerTxnRequest } from '../../../../core/models/tracker.model';

/**
 * The Add sheet (the + button): paste a bank or UPI SMS, or type a transaction in. A pasted SMS goes through the same reader as the Android app will
 * (POST /tracker/sms), and the sheet shows what happened at each step, so it is clear why a message was saved, caught as a duplicate or ignored.
 * Until the Android app exists, pasting (and, on Android, sharing an SMS to the installed app) is how SMS reach SnapTracker.
 */
@Component({
  selector: 'app-tracker-add',
  imports: [TrackerIcon, TrackerForm],
  templateUrl: './tracker-add.html',
  host: { '(document:keydown.escape)': 'close()' },
})

export class TrackerAdd {
  protected readonly body = signal('');
  protected readonly sender = signal('');
  protected readonly i18n = inject(I18nService);
  protected readonly state = inject(TrackerStateService);
  protected readonly tab = signal<'paste' | 'manual'>('paste');
  protected readonly result = signal<TrackerSmsResult | null>(null);

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

  // #endregion
}
