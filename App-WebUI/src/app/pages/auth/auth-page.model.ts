/** /login and /signup share one page. */
export type AuthMode = 'login' | 'signup';

/** How the visitor logs in: the password, or a one-time code (only for the apps that allow code login). */
export type LoginWay = 'password' | 'otp';

/** The steps of the code login: say where to send the code, then type it. */
export type OtpStep = 'ask' | 'code';

/** The steps of the sign-up: the account details, then the code that checks them. */
export type SignupStep = 'details' | 'code';

/** What the first sign-up step asked, kept for the second (the code is checked with the account). */
export interface SignupDetails {
  name: string;
  email: string;
  password: string;
  mobile: string | null;
}
