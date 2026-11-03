export const environment = {
  name: 'development',
  apiBaseUrl: 'https://localhost:7001/api',
  // Development only: the seeded logins (INSERT/Common/009_Users.sql), one per role. The login form is pre-filled with the first; the others are one tap away.
  devLogins: [
    { email: 'superadmin@thakurg.com', password: 'Super@1234' },
    { email: 'admin@thakurg.com', password: 'Admin@1234' },
    { email: 'user@thakurg.com', password: 'User@1234' }
  ],
  // Waiting times in milliseconds. A sleeping Azure SQL database (free offer) can take about a minute to wake up, so calls that reach it wait longer.
  timings: {
    authCallMs: 120000,
    tabHelloMs: 300,
    renewBeforeMs: 60000,
    i18nLoadMs: 5000,
    settingsLoadMs: 5000,
    settingsSaveMs: 15000,
    musicLoadMs: 120000,
    musicResumeGapMs: 60000
  },
  // SnapKhata bill photos. Keep maxPhotos and maxPhotoBytes in step with the API (Khata:Limits:MaxPhotosPerEntry / MaxPhotoBytes).
  khata: {
    maxPhotos: 3,
    photoEdgePx: 1600,
    maxPhotoBytes: 2097152,
    maxPickedBytes: 10485760
  }
};
