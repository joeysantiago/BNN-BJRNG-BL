import { ApiService } from './api.service';
import { I18nService } from './i18n.service';
import { Injectable, inject } from '@angular/core';
import { TrackerData, TrackerFlow, TrackerImportResult, TrackerImportSms, TrackerOwner, TrackerSettings, TrackerSmsResult, TrackerTxnRequest } from './models/tracker.model';

const TIMEOUT = 30000;

/**
 * SnapTracker's endpoints (api/tracker/...). Every call carries the login (ApiService) and the language, so the server's messages come translated.
 * A change answers with the server's message and the whole SnapTracker data, so the screens show it at once.
 */
@Injectable({ providedIn: 'root' })

export class TrackerApiService {
  private readonly api = inject(ApiService);
  private readonly i18n = inject(I18nService);

  // #region Public Methods

  state(): Promise<TrackerData> {
    return this.api.send<TrackerData>('GET', '/tracker/state', this.init(), TIMEOUT);
  }

  exportData(): Promise<Record<string, unknown>> {
    return this.api.send<Record<string, unknown>>('GET', '/tracker/export', this.init(), TIMEOUT);
  }

  deleteAll(): Promise<{ text: string; data: TrackerData }> {
    return this.change('DELETE', '/tracker/me');
  }

  readAlerts(): Promise<{ text: string; data: TrackerData }> {
    return this.change('POST', '/tracker/alerts/read');
  }

  deleteSmsTexts(): Promise<{ text: string; data: TrackerData }> {
    return this.change('DELETE', '/tracker/sms-texts');
  }

  remove(id: number): Promise<{ text: string; data: TrackerData }> {
    return this.change('DELETE', `/tracker/transactions/${id}`);
  }

  add(request: TrackerTxnRequest): Promise<{ text: string; data: TrackerData }> {
    return this.change('POST', '/tracker/transactions', request);
  }

  /** The user's own names and mobiles ("My details"); every transaction is worked out again with them. */
  saveDetails(owner: TrackerOwner): Promise<{ text: string; data: TrackerData }> {
    return this.change('PUT', '/tracker/details', owner);
  }

  saveSettings(settings: TrackerSettings): Promise<{ text: string; data: TrackerData }> {
    return this.change('PUT', '/tracker/settings', settings);
  }

  edit(id: number, request: TrackerTxnRequest): Promise<{ text: string; data: TrackerData }> {
    return this.change('PUT', `/tracker/transactions/${id}`, request);
  }

  /** Reads one bank or UPI SMS; the answer says what happened at each step. */
  readSms(sender: string, body: string): Promise<{ result: TrackerSmsResult; state: TrackerData }> {
    return this.api.send<{ result: TrackerSmsResult; state: TrackerData }>('POST', '/tracker/sms', this.init({ sender, body }), TIMEOUT);
  }

  /** Imports one batch of received bank and UPI messages of an SMS backup; each keeps the date it was received. */
  importSms(messages: TrackerImportSms[]): Promise<{ result: TrackerImportResult; state: TrackerData }> {
    return this.api.send<{ result: TrackerImportResult; state: TrackerData }>('POST', '/tracker/sms/import', this.init({ messages }), TIMEOUT);
  }

  /** The user's own name for a bank account, card or loan; empty clears it. */
  label(id: number, label: string | null): Promise<{ text: string; data: TrackerData }> {
    return this.change('PUT', `/tracker/accounts/${id}`, { label });
  }

  /** "Mark as…": what the transaction counts towards; remember applies it to the merchant (or, for an EMI, every debit of about that amount). */
  flow(id: number, flow: TrackerFlow, remember: boolean): Promise<{ text: string; data: TrackerData }> {
    return this.change('PUT', `/tracker/transactions/${id}/flow`, { flow, remember });
  }

  category(id: number, category: string, remember: boolean): Promise<{ text: string; data: TrackerData }> {
    return this.change('PUT', `/tracker/transactions/${id}/category`, { category, remember });
  }

  /** Enable, pause, resume or revoke SMS reading on the phone. */
  tracking(action: 'enable' | 'pause' | 'resume' | 'revoke'): Promise<{ text: string; data: TrackerData }> {
    return this.change('POST', `/tracker/tracking/${action}`);
  }

  /** Confirm, ignore, restore, or "not a duplicate". */
  act(id: number, action: 'confirm' | 'ignore' | 'restore' | 'not-duplicate'): Promise<{ text: string; data: TrackerData }> {
    return this.change('POST', `/tracker/transactions/${id}/${action}`);
  }

  // #endregion

  // #region Private Methods

  private init(body?: unknown): RequestInit {
    const headers = { 'Accept-Language': this.i18n.lang() };
    return body === undefined ? { headers } : this.api.json(body, headers);
  }

  private async change(method: string, path: string, body?: unknown): Promise<{ text: string; data: TrackerData }> {
    const res = await this.api.sendFull<TrackerData>(method, path, this.init(body), TIMEOUT);
    return { text: res.message ?? '', data: res.data };
  }

  // #endregion
}
