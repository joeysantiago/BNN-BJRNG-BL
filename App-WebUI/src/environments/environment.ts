/**
 * Mojito is the Angular-only demo: there is no API and no database. The login, profile and Settings pages talk to a demo backend inside the
 * browser (core/demo), which keeps its data in this browser's storage. The logins are the same as the seeded accounts of the API branches
 * (INSERT/Common/009_Users.sql), one per role; the login form is pre-filled with the first, the others are one tap away.
 */
export const environment = {
  name: 'demo',
  apiBaseUrl: '',
  // true: the login form is pre-filled with the first login below and all of them are shown as one-tap buttons (for testing).
  // false: no pre-fill and no login buttons, the form starts empty. Set this to false before deploying.
  showDevLogins: true,
  devLogins: [
    { email: 'superadmin@thakurg.com', password: 'Super@1234' },
    { email: 'admin@thakurg.com', password: 'Admin@1234' },
    { email: 'user@thakurg.com', password: 'User@1234' }
  ],
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
  }
};
