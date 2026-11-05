export const environment = {
  name: 'uat',
  apiBaseUrl: 'https://uat.thakurg.com/api',
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
    maxPickedBytes: 10485760,
    contactPhotoPx: 512,
    maxContactPhotoBytes: 524288
  },
  // Disposable mail domains that cannot sign up (checked before a code is sent; the API checks its own list, Auth:BlockedEmailDomains).
  blockedEmailDomains: ['yopmail.com', 'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com', 'temp-mail.org', 'trashmail.com', 'sharklasers.com', 'getnada.com', 'dispostable.com']
};
