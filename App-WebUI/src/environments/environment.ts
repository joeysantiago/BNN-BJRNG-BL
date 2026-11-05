/**
 * Mojito is the Angular-only demo: there is no API and no database. The login, profile and Settings pages talk to a demo backend inside the
 * browser (core/demo), which keeps its data in this browser's storage. No login or password is kept here: the one-tap logins of the
 * login page are a switch on the demo users (showOnLogin), set on Settings > General, as the API branches keep them on the Users table.
 */
export const environment = {
  name: 'demo',
  apiBaseUrl: '',
  // Waiting times in milliseconds, as in the API branches. `demoDelayMs` is how long the demo backend takes to answer, so busy states show.
  timings: {
    authCallMs: 120000,
    tabHelloMs: 300,
    renewBeforeMs: 60000,
    demoDelayMs: 250
  },
  // SnapKhata bill photos, the same limits as the API branches (Khata:Limits:MaxPhotosPerEntry / MaxPhotoBytes). The demo keeps photos in this browser.
  khata: {
    maxPhotos: 3,
    photoEdgePx: 1600,
    maxPhotoBytes: 2097152,
    maxPickedBytes: 10485760,
    contactPhotoPx: 512,
    maxContactPhotoBytes: 524288
  },
  // Disposable mail domains that cannot sign up (checked before a code is sent; the demo backend refuses the same).
  blockedEmailDomains: ['yopmail.com', 'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com', 'temp-mail.org', 'trashmail.com', 'sharklasers.com', 'getnada.com', 'dispostable.com']
};
