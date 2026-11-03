import { KhataApiService } from './khata-api.service';
import { Injectable, inject, signal } from '@angular/core';
import { KhataConfirm, KhataToast, KhataViewer, KhataViewerItem } from './models/khata.model';

const TOAST_MS = 2800;

/**
 * The parts of SnapKhata that sit above every screen and live in the shell: the "are you sure?" sheet, the short toast after a save,
 * and the full-screen photo viewer. Bill photos need the login token, so they are fetched once and kept as blob URLs here.
 */
@Injectable({ providedIn: 'root' })

export class KhataUiService {
  private toastId = 0;
  private readonly api = inject(KhataApiService);
  readonly toast = signal<KhataToast | null>(null);
  readonly sheet = signal<KhataConfirm | null>(null);
  readonly viewer = signal<KhataViewer | null>(null);
  private readonly urls = new Map<number, Promise<string | null>>();

  // #region Public Methods

  closeViewer(): void {
    this.viewer.set(null);
  }

  answer(ok: boolean): void {
    const sheet = this.sheet();
    this.sheet.set(null);
    sheet?.resolve(ok);
  }

  /** Shows a short "saved" message at the bottom for a few seconds. */
  notify(text: string): void {
    const id = ++this.toastId;
    this.toast.set({ id, text });
    setTimeout(() => {
      if (this.toast()?.id === id)
        this.toast.set(null);
    }, TOAST_MS);
  }

  /** Steps the viewer forwards (1) or backwards (-1), round the end. */
  step(direction: number): void {
    const v = this.viewer();
    if (!v || v.items.length < 2)
      return;
    void this.show(v.items, (v.index + direction + v.items.length) % v.items.length);
  }

  /** Forgets a deleted photo's file. */
  forget(attachmentId: number): void {
    void this.urls.get(attachmentId)?.then((url) => url && URL.revokeObjectURL(url));
    this.urls.delete(attachmentId);
  }

  /** Asks "are you sure?" in a sheet over the screen. Resolves true when the reader confirms. */
  confirm(title: string): Promise<boolean> {
    this.sheet()?.resolve(false);
    return new Promise((resolve) => this.sheet.set({ title, resolve }));
  }

  /** The blob URL of a saved bill photo, fetched once per page load. Null when the file can't be loaded. */
  photoUrl(attachmentId: number): Promise<string | null> {
    let url = this.urls.get(attachmentId);
    if (!url) {
      url = this.api.photo(attachmentId).then((blob) => URL.createObjectURL(blob), () => null);
      this.urls.set(attachmentId, url);
      void url.then((u) => u === null && this.urls.delete(attachmentId));
    }
    return url;
  }

  /** Opens the photo viewer at one photo; a saved photo's file is filled in once it has loaded. */
  async show(items: KhataViewerItem[], index: number): Promise<void> {
    this.viewer.set({ items, index });
    const item = items[index];
    if (item.url || item.attachmentId === undefined)
      return;
    const url = await this.photoUrl(item.attachmentId);
    const v = this.viewer();
    if (v && v.items[v.index] === item)
      this.viewer.set({ index: v.index, items: v.items.map((x) => (x === item ? { ...x, url } : x)) });
  }

  // #endregion
}
