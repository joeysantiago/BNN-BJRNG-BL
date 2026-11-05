/** A user shown as a one-tap login on the login page (GET /admin/users/quick-logins). */
export interface QuickLoginUser {
  id: number;
  email: string;
}

/** The server's answer shown under the list. */
export interface QuickLoginNotice {
  text: string;
  error: boolean;
}
