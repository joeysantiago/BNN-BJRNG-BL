/** The player buttons of the Android app's "Now playing" notification, handled by the page that plays. */
export interface NativeMediaHandlers {
  prev(): void;
  next(): void;
  toggle(): void;
}

/** Background playback of the Android app (MediaControlPlugin.java): the "Now playing" notification that keeps the app alive while it plays. */
export interface MediaControlPlugin {
  stop(): Promise<void>;
  update(options: { title: string; text: string; playing: boolean }): Promise<void>;
  addListener(event: 'action', listener: (e: { action: keyof NativeMediaHandlers }) => void): Promise<{ remove(): Promise<void> }>;
}

/** What the Android app (Capacitor) puts on window; absent in a browser. */
export interface MediaWindow {
  Capacitor?: { Plugins?: { MediaControl?: MediaControlPlugin }; isNativePlatform?: () => boolean };
}
