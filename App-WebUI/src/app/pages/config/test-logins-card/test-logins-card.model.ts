/** A test login as Settings > General shows it (GET /admin/test-logins). The password is never sent back: hasPassword says one is saved. */
export interface TestLogin {
  id: number;
  email: string;
  sortOrder: number;
  hasPassword: boolean;
  showOnLogin: boolean;
}

/** The server's answer shown under the list. */
export interface TestLoginNotice {
  text: string;
  error: boolean;
}

/** What Settings > General sends to add or change a test login (POST / PUT /admin/test-logins). An empty password keeps the saved one. */
export interface TestLoginBody {
  email: string;
  password: string;
  sortOrder: number;
  showOnLogin: boolean;
}
