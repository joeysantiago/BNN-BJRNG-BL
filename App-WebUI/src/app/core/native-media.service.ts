import { Injectable } from '@angular/core';
import { MediaControlPlugin, MediaWindow, NativeMediaHandlers } from './models/native-media.model';

/**
 * Background playback in the Android app (plugin MediaControl): Android freezes or closes an app in the background unless it runs a media service the way
 * music apps do, so while Creta, Nexon or YouTube plays, the app shows a "Now playing" notification (previous, play/pause, next) and keeps playing with
 * the screen off or another app open. The page that plays connects its buttons; nothing shows before the first play, and it ends when the page closes.
 * In a browser (and while the pages are prerendered) there is no plugin and nothing changes. It needs no other native file of the app.
 */
@Injectable({ providedIn: 'root' })

export class NativeMediaService {
  private shown = false;
  private listening = false;
  private handlers: NativeMediaHandlers | null = null;
  private readonly plugin = NativeMediaService.find();

  // #region Public Methods

  /** The page closed: the notification goes and the app may sleep in the background again. */
  disconnect(): void {
    this.handlers = null;
    if (!this.shown)
      return;
    this.shown = false;
    void this.plugin?.stop().catch(() => undefined);
  }

  /** The player page that is open takes the notification's buttons. */
  connect(handlers: NativeMediaHandlers): void {
    this.handlers = handlers;
    if (!this.plugin || this.listening)
      return;
    this.listening = true;
    void this.plugin.addListener('action', (e) => this.handlers?.[e.action]());
  }

  /** What plays now and whether it is playing; a paused player keeps its notification (to play again from there), but not before it first played. */
  show(title: string, text: string, playing: boolean): void {
    if (!this.plugin || (!playing && !this.shown))
      return;
    this.shown = true;
    void this.plugin.update({ title, text, playing }).catch(() => undefined);
  }

  // #endregion

  // #region Private Methods

  /** The plugin inside the Android app, or null in a browser and while the pages are prerendered. */
  private static find(): MediaControlPlugin | null {
    if (typeof window === 'undefined')
      return null;
    const cap = (window as unknown as MediaWindow).Capacitor;
    return cap?.isNativePlatform?.() ? (cap.Plugins?.MediaControl ?? null) : null;
  }

  // #endregion
}
