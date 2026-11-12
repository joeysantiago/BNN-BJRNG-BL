/** What the Android app (Capacitor, thakurg-Apps/thakurg-android) puts on window; absent in a browser. */
export interface NativeWindow {
  Capacitor?: { Plugins?: Record<string, unknown>; isNativePlatform?: () => boolean };
}

/** A listener the Android app hands back; remove() stops it. */
export interface NativeListener {
  remove(): Promise<void>;
}

/** One bank SMS the Android app read on the phone: caught as it arrived (with an id, until it is acknowledged) or read from the inbox. */
export interface NativeSms {
  id?: string;
  body: string;
  sender: string;
  receivedAt: number;
  senderName: string | null;
}

/** SMS reading on the phone: on only when the user allowed SMS access and tracking is on. */
export interface NativeSmsStatus {
  queued: number;
  enabled: boolean;
  permission: string;
}

/** One read of the inbox: the bank SMS found, how far it was read (ms) and whether more is left. */
export interface NativeInbox {
  more: boolean;
  until: number;
  messages: NativeSms[];
}

/** The SnapTracker plugin of the Android app (SmsTrackerPlugin.java). */
export interface SmsTrackerPlugin {
  pause(): Promise<NativeSmsStatus>;
  enable(): Promise<NativeSmsStatus>;
  resume(): Promise<NativeSmsStatus>;
  revoke(): Promise<NativeSmsStatus>;
  getStatus(): Promise<NativeSmsStatus>;
  getPending(): Promise<{ messages: NativeSms[] }>;
  readInbox(options: { since: number }): Promise<NativeInbox>;
  markInbox(options: { until: number }): Promise<NativeSmsStatus>;
  acknowledge(options: { ids: string[] }): Promise<{ removed: number }>;
  addListener(event: 'smsReceived', listener: (sms: NativeSms) => void): Promise<NativeListener>;
}

/** The back button plugin of the Android app (AppBackPlugin.java). */
export interface AppBackPlugin {
  goBack(): Promise<void>;
  addListener(event: 'backButton', listener: () => void): Promise<NativeListener>;
}
