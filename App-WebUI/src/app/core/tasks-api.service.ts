import { ApiService } from './api.service';
import { I18nService } from './i18n.service';
import { ApiResponse } from './models/api.model';
import { Injectable, inject, signal } from '@angular/core';
import { TaskCategory, TaskChanges, TaskHistoryEntry, TaskItem, TaskPinStatus, TaskRequest, TaskSettings, TaskShare, TaskShared, TaskSharePermission } from './models/tasks.model';

const LOCKED = 423;

/**
 * The Tasks endpoints of the API (api/tasks/...). Every call carries the login (ApiService) and the language, so the server's messages come translated.
 * A 423 answer means the App Lock closed on the server (time ran out or another tab locked it): pinRequired then changes and the lock screen shows.
 */
@Injectable({ providedIn: 'root' })

export class TasksApiService {
  readonly pinRequired = signal(0);
  private readonly api = inject(ApiService);
  private readonly i18n = inject(I18nService);

  // #region Public Methods

  tasks(): Promise<TaskItem[]> {
    return this.data<TaskItem[]>('GET', '/tasks/items');
  }

  deleted(): Promise<TaskItem[]> {
    return this.data<TaskItem[]>('GET', '/tasks/items/deleted');
  }

  /** The tasks others shared with the caller: requests waiting for an answer and accepted ones. */
  shared(): Promise<TaskShared[]> {
    return this.data<TaskShared[]>('GET', '/tasks/shared');
  }

  lockPin(): Promise<TaskPinStatus> {
    return this.data<TaskPinStatus>('POST', '/tasks/pin/lock');
  }

  keepPin(): Promise<TaskPinStatus> {
    return this.data<TaskPinStatus>('POST', '/tasks/pin/keep');
  }

  settings(): Promise<TaskSettings> {
    return this.data<TaskSettings>('GET', '/tasks/settings');
  }

  pinStatus(): Promise<TaskPinStatus> {
    return this.data<TaskPinStatus>('GET', '/tasks/pin');
  }

  categories(): Promise<TaskCategory[]> {
    return this.data<TaskCategory[]>('GET', '/tasks/categories');
  }

  /** The address of a picture. The browser loads it with the access cookie of the login, and the server checks that the task is the viewer's own. */
  photoUrl(attachmentId: number): string {
    return this.api.url(`/tasks/attachments/${attachmentId}`);
  }

  /** Who a task of the caller is shared with (owner only). */
  shares(id: number): Promise<TaskShare[]> {
    return this.data<TaskShare[]>('GET', `/tasks/items/${id}/shares`);
  }

  /** A test WhatsApp message to the mobile number of the profile. Resolves with the server's message. */
  testWhatsApp(): Promise<ApiResponse<null>> {
    return this.call<null>('POST', '/tasks/settings/whatsapp-test');
  }

  /** Deletes the tasks, pictures and settings of the caller in Tasks and their access to it (the common account stays). */
  deleteAccount(): Promise<ApiResponse<null>> {
    return this.call<null>('DELETE', '/tasks/me');
  }

  verifyPin(pin: string): Promise<TaskPinStatus> {
    return this.data<TaskPinStatus>('POST', '/tasks/pin/verify', { pin });
  }

  history(id: number): Promise<TaskHistoryEntry[]> {
    return this.data<TaskHistoryEntry[]>('GET', `/tasks/items/${id}/history`);
  }

  remove(id: number): Promise<ApiResponse<TaskChanges>> {
    return this.call<TaskChanges>('DELETE', `/tasks/items/${id}`);
  }

  reopen(id: number): Promise<ApiResponse<TaskChanges>> {
    return this.call<TaskChanges>('POST', `/tasks/items/${id}/reopen`);
  }

  restore(id: number): Promise<ApiResponse<TaskChanges>> {
    return this.call<TaskChanges>('POST', `/tasks/items/${id}/restore`);
  }

  complete(id: number): Promise<ApiResponse<TaskChanges>> {
    return this.call<TaskChanges>('POST', `/tasks/items/${id}/complete`);
  }

  duplicate(id: number): Promise<ApiResponse<TaskChanges>> {
    return this.call<TaskChanges>('POST', `/tasks/items/${id}/duplicate`);
  }

  deleteCategory(id: number): Promise<ApiResponse<number>> {
    return this.call<number>('DELETE', `/tasks/categories/${id}`);
  }

  /** Ends a share: the owner stops sharing, or the person it is shared with removes the task from their list. */
  removeShare(shareId: number): Promise<ApiResponse<number>> {
    return this.call<number>('DELETE', `/tasks/shares/${shareId}`);
  }

  removePin(pin: string): Promise<ApiResponse<TaskPinStatus>> {
    return this.call<TaskPinStatus>('POST', '/tasks/pin/remove', { pin });
  }

  declineShare(shareId: number): Promise<ApiResponse<number>> {
    return this.call<number>('POST', `/tasks/shares/${shareId}/decline`);
  }

  acceptShare(shareId: number): Promise<ApiResponse<TaskShared>> {
    return this.call<TaskShared>('POST', `/tasks/shares/${shareId}/accept`);
  }

  create(request: TaskRequest): Promise<ApiResponse<TaskChanges>> {
    return this.call<TaskChanges>('POST', '/tasks/items', request);
  }

  removePhoto(attachmentId: number): Promise<ApiResponse<TaskChanges>> {
    return this.call<TaskChanges>('DELETE', `/tasks/attachments/${attachmentId}`);
  }

  saveSettings(settings: TaskSettings): Promise<ApiResponse<TaskSettings>> {
    return this.call<TaskSettings>('PUT', '/tasks/settings', settings);
  }

  toggle(id: number, itemId: number, isDone: boolean): Promise<TaskChanges> {
    return this.data<TaskChanges>('PUT', `/tasks/items/${id}/checklist/${itemId}`, { isDone });
  }

  update(id: number, request: TaskRequest): Promise<ApiResponse<TaskChanges>> {
    return this.call<TaskChanges>('PUT', `/tasks/items/${id}`, request);
  }

  addCategory(name: string, color: string): Promise<ApiResponse<TaskCategory>> {
    return this.call<TaskCategory>('POST', '/tasks/categories', { name, color });
  }

  setPin(pin: string, currentPin: string | null): Promise<ApiResponse<TaskPinStatus>> {
    return this.call<TaskPinStatus>('PUT', '/tasks/pin', { pin, currentPin });
  }

  saveCategory(id: number, name: string, color: string): Promise<ApiResponse<TaskCategory>> {
    return this.call<TaskCategory>('PUT', `/tasks/categories/${id}`, { name, color });
  }

  upload(id: number, files: { file: Blob; name: string }[]): Promise<ApiResponse<TaskChanges>> {
    const form = new FormData();
    for (const f of files)
      form.append('files', f.file, f.name);
    return this.call<TaskChanges>('POST', `/tasks/items/${id}/attachments`, form);
  }

  /** Shares a task with the account of an e-mail address or mobile number; sharing again with the same person changes the permission. */
  share(id: number, to: string, permission: TaskSharePermission): Promise<ApiResponse<TaskShare>> {
    return this.call<TaskShare>('POST', `/tasks/items/${id}/shares`, { to, permission });
  }

  bulk(ids: number[], action: string, categoryId: number | null): Promise<ApiResponse<TaskChanges>> {
    return this.call<TaskChanges>('POST', '/tasks/items/bulk', { ids, action, categoryId });
  }

  // #endregion

  // #region Private Methods

  private async data<T>(method: string, path: string, body?: unknown): Promise<T> {
    return (await this.call<T>(method, path, body)).data;
  }

  /** One call. FormData goes as it is (multipart); anything else as JSON. */
  private async call<T>(method: string, path: string, body?: unknown): Promise<ApiResponse<T>> {
    const headers = { 'Accept-Language': this.i18n.lang() };
    const init: RequestInit = body === undefined ? { headers } : body instanceof FormData ? { headers, body } : this.api.json(body, headers);
    try {
      return await this.api.sendFull<T>(method, path, init);
    } catch (e) {
      if ((e as { status?: number }).status === LOCKED)
        this.pinRequired.update((n) => n + 1);
      throw e;
    }
  }

  // #endregion
}
