import { ApiService } from './api.service';
import { I18nService } from './i18n.service';
import { ApiResponse } from './models/api.model';
import { Injectable, inject, signal } from '@angular/core';
import { TaskCategory, TaskChanges, TaskHistoryEntry, TaskItem, TaskPinStatus, TaskRequest, TaskSettings } from './models/tasks.model';

const LOCKED = 423;

/**
 * The My Tasks endpoints of the API (api/tasks/...). Every call carries the login (ApiService) and the language, so the server's messages come translated.
 * Mojito has no API: the demo backend inside the browser answers them (core/demo/tasks-demo.ts).
 * A 423 answer means the App Lock closed on the server (time ran out or another tab locked it): pinRequired then changes and the lock screen shows.
 */
@Injectable({ providedIn: 'root' })

export class TasksApiService {
  readonly pinRequired = signal(0);
  private readonly photos = new Map<number, string>();
  private readonly api = inject(ApiService);
  private readonly i18n = inject(I18nService);

  // #region Public Methods

  tasks(): Promise<TaskItem[]> {
    return this.data<TaskItem[]>('GET', '/tasks/items');
  }

  deleted(): Promise<TaskItem[]> {
    return this.data<TaskItem[]>('GET', '/tasks/items/deleted');
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

  /** The address of a picture. Mojito has no API: it is the data: URL the demo backend keeps (core/demo/tasks-demo.ts), read once and kept, as pictures never change. */
  photoUrl(attachmentId: number): string {
    const url = this.photos.get(attachmentId) ?? this.api.taskPhoto(attachmentId);
    if (url)
      this.photos.set(attachmentId, url);
    return url ?? '';
  }

  /** A test WhatsApp message to the mobile number of the profile. Resolves with the server's message. */
  testWhatsApp(): Promise<ApiResponse<null>> {
    return this.call<null>('POST', '/tasks/settings/whatsapp-test');
  }

  /** Deletes the tasks, pictures and settings of the caller in My Tasks and their access to it (the common account stays). */
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

  removePin(pin: string): Promise<ApiResponse<TaskPinStatus>> {
    return this.call<TaskPinStatus>('POST', '/tasks/pin/remove', { pin });
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
