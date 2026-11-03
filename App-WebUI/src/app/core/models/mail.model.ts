/** What a mail server profile of Settings > Mail sends: one-time sign-in codes, or SnapKhata notifications. */
export type MailPurpose = 'otp' | 'notification';

/** How the connection to the mail server is secured: STARTTLS (port 587), SSL/TLS from the start (port 465) or none. */
export type MailSecurity = 'starttls' | 'ssl' | 'none';

/** A mail server profile (GET /admin/mail). The password is never sent back: hasPassword says one is saved. */
export interface MailSetting {
  host: string;
  port: number;
  enabled: boolean;
  fromName: string;
  userName: string;
  fromAddress: string;
  hasPassword: boolean;
  purpose: MailPurpose;
  security: MailSecurity;
}
