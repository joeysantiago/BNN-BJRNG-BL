/** How the connection to the mail server is secured: STARTTLS (port 587), SSL/TLS from the start (port 465) or none. */
export type MailSecurity = 'starttls' | 'ssl' | 'none';

/** The site's default mail server (GET /admin/mail, purpose "default"). The password is never sent back: hasPassword says one is saved. */
export interface MailServer {
  host: string;
  port: number;
  enabled: boolean;
  purpose: string;
  fromName: string;
  userName: string;
  fromAddress: string;
  hasPassword: boolean;
  security: MailSecurity;
}

/** The server's answer shown under the form. */
export interface GeneralNotice {
  text: string;
  error: boolean;
}
