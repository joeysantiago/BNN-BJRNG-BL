import { NativeWindow } from './models/native-app.model';

/** A plugin of the Android app (thakurg-Apps/thakurg-android), or null in a browser and while the pages are prerendered. */
export function nativePlugin<T>(name: string): T | null {
  if (typeof window === 'undefined')
    return null;
  const cap = (window as unknown as NativeWindow).Capacitor;
  return cap?.isNativePlatform?.() ? ((cap.Plugins?.[name] as T | undefined) ?? null) : null;
}

/** True inside the Android app (Capacitor), false in a browser and while the pages are prerendered. */
export function isNativeApp(): boolean {
  return typeof window !== 'undefined' && !!(window as unknown as NativeWindow).Capacitor?.isNativePlatform?.();
}
