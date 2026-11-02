import { RoleInfo } from './role.model';
import { TranslationKey } from './i18n.model';

/**
 * The logged-in account, as the API returns it (UserDto). `apps` holds the app codes the user may open; administrators (super admins and admins) may open every app.
 * `permissions` are the rights of the user's role ("settings.users:edit"); a super admin has every right. `hiddenFeatures` are the options the user switched off for themselves.
 */
export interface AuthUser {
  id: number;
  email: string;
  apps: string[];
  roleId: number;
  isAdmin: boolean;
  language: string;
  roleCode: string;
  roleName: string;
  displayName: string;
  permissions: string[];
  hiddenFeatures: string[];
}

/** Answer of login, sign-up and refresh. The access token is kept in memory only; the refresh token is an HttpOnly cookie. */
export interface AuthResult {
  user: AuthUser;
  accessToken: string;
  expiresInSeconds: number;
}

/** One app of the Users tab. `autoGrant` apps are given to every new account on sign-up. */
export interface AppAccess {
  code: string;
  autoGrant: boolean;
}

/** GET /admin/users: every app code, every role (the role dropdown) and every user with their role and access. */
export interface UserAccess {
  apps: AppAccess[];
  roles: RoleInfo[];
  users: AuthUser[];
}

/** An app the profile page and the Users tab can name and link to. `path` is null for apps without a page on this site yet. */
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

/** A login of the seeded development accounts, offered as a one-tap fill on the login page (development builds only). */
export interface DevLogin {
  email: string;
  password: string;
}
