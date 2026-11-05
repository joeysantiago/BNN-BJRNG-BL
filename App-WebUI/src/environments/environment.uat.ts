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
  }
};
