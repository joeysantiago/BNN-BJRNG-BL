import { TranslationKey } from './i18n.model';

/** The logged-in account, as the API returns it (UserDto). `apps` holds the app codes the user may open; administrators may open every app. */
export interface AuthUser {
  id: number;
  apps: string[];
  email: string;
  isAdmin: boolean;
  language: string;
  displayName: string;
}

/** Answer of login, sign-up and refresh. The access token is kept in memory only; the refresh token is an HttpOnly cookie. */
export interface AuthResult {
  user: AuthUser;
  accessToken: string;
  expiresInSeconds: number;
}

/** One app of the Users and access panel. `autoGrant` apps are given to every new account on sign-up. */
export interface AppAccess {
  code: string;
  autoGrant: boolean;
}

/** GET /admin/users: every app code and every user with their access. */
export interface UserAccess {
  users: AuthUser[];
  apps: AppAccess[];
}

/** An app the profile page and the Users and access panel can name and link to. `path` is null for apps without a page on this site yet. */
export interface AppLink {
  code: string;
  path: string | null;
  name: TranslationKey;
}

/** Messages between open tabs, so a login, a renewed token and a logout apply to every tab. */
export interface AuthTabMessage {
  token?: string;
  user?: AuthUser;
  expiresAt?: number;
  type: 'hello' | 'session' | 'logout';
}

/** How ApiService reaches the login: the current access token, and one refresh after a 401. */
export interface AuthHooks {
  token: () => string | null;
  refresh: () => Promise<boolean>;
}
