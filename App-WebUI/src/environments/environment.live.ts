export const environment = {
  name: 'live',
  apiBaseUrl: 'https://thakurg.com/api',
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
  }
};
