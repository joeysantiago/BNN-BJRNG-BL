export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** The window as index.html leaves it: the install prompt the browser offered before Angular started, if any. */
export interface InstallWindow extends Window {
  __installPrompt?: BeforeInstallPromptEvent | null;
}
