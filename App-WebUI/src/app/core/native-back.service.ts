import { Injectable } from '@angular/core';
import { nativePlugin } from './native-app';
import { AppBackPlugin } from './models/native-app.model';

/** What counts as open on top of the page: a sheet or drawer (modal role="dialog") or a menu whose button is expanded. */
const OPEN_OVERLAY = '[role="dialog"][aria-modal="true"], [aria-expanded="true"]';

/** How long a page gets to close its sheet or menu after the Escape key, before the back button goes to the previous page instead. */
const CLOSE_WAIT_MS = 100;

/**
 * The Android back button in the app (thakurg-Apps/thakurg-android, plugin AppBack). It first closes what is open on top, the way Escape does: a native
 * dialog, then a sheet, drawer or menu. When nothing is open it goes to the previous page; on the first page the app asks for a second press to exit.
 * In a browser there is no plugin and nothing changes.
 */
@Injectable({ providedIn: 'root' })

export class NativeBackService {
  private started = false;
  private readonly back = nativePlugin<AppBackPlugin>('AppBack');

  // #region Public Methods

  /** Listens to the back button, once per page load (called after the first render). */
  start(): void {
    if (!this.back || this.started)
      return;
    this.started = true;
    void this.back.addListener('backButton', () => void this.handle());
  }

  // #endregion

  // #region Private Methods

  private async handle(): Promise<void> {
    if (!(await this.closeTop()))
      await this.back?.goBack();
  }

  /** Closes the top open dialog, sheet, drawer or menu; resolves false when nothing was open or it did not close. */
  private async closeTop(): Promise<boolean> {
    const dialogs = document.querySelectorAll<HTMLDialogElement>('dialog[open]');
    const dialog = dialogs[dialogs.length - 1] as (HTMLDialogElement & { requestClose?: () => void }) | undefined;
    if (dialog) {
      // requestClose runs the dialog's own cancel handling, as Escape does.
      if (dialog.requestClose)
        dialog.requestClose();
      else
        dialog.close();
      return true;
    }
    const open = document.querySelector(OPEN_OVERLAY);
    if (!open)
      return false;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, CLOSE_WAIT_MS));
    return !open.isConnected || open.getAttribute('aria-expanded') === 'false';
  }

  // #endregion
}
