export const environment = {
  name: 'development',
  apiBaseUrl: 'https://localhost:7001/api',
  // Development only: the login form is pre-filled with the seeded admin (INSERT/Common/008_Users.sql).
  devEmail: 'admin@thakurg.com',
  devPassword: 'Admin@1234',
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
