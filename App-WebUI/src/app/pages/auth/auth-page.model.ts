/** /login and /signup share one page. */
export type AuthMode = 'login' | 'signup';

/** How the visitor logs in: the password, or a one-time code (only for the apps that allow code login). */
export type LoginWay = 'password' | 'otp';

/** The steps of the code login: say where to send the code, then type it. */
export type OtpStep = 'ask' | 'code';
