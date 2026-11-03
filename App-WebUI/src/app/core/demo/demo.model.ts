import { PageCode } from '../models/role.model';
import { SettingsOverrides } from '../models/app-settings.model';

/** One text of the API's Messages table, in the three languages. */
export interface DemoText {
  en: string;
  hi: string;
  ar: string;
}

/** Message code → texts (INSERT/Common/001_Messages.sql). */
export type DemoMessages = Record<string, DemoText>;

/** An account of the demo database (Users table). The password is kept as a SHA-256 hash; `avatarData` is the picture as a data: URL. */
export interface DemoUser {
  id: number;
  email: string;
  apps: string[];
  roleId: number;
  hidden: string[];
  language: string;
  createdOn: string;
  passwordHash: string;
  displayName: string;
  failedLogins: number;
  avatar: string | null;
  lockedUntil: number | null;
  avatarData: string | null;
  lastLoginOn: string | null;
}

/** A role of the demo database (Roles table). */
export interface DemoRole {
  id: number;
  code: string;
  name: string;
  isSystem: boolean;
  sortOrder: number;
  isDefault: boolean;
  description: string | null;
}

/** A page rights are given for (Pages table). */
export interface DemoPage {
  id: number;
  code: PageCode;
  hasAdd: boolean;
  hasDelete: boolean;
}

/** The rights of a role on a page (RolePermissions table). */
export interface DemoPermission {
  id: number;
  pageId: number;
  roleId: number;
  canAdd: boolean;
  canEdit: boolean;
  canView: boolean;
  canDelete: boolean;
}

/** An app a user can be given (Apps table). `autoGrant` apps are given to every sign-up. */
export interface DemoApp {
  code: string;
  autoGrant: boolean;
}

/** A login session (UserSessions table). The token stands for both the access token and the refresh cookie of the API. */
export interface DemoSession {
  token: string;
  userId: number;
  expiresAt: number;
}

/** The whole demo database, kept in this browser's storage. `settings` are the saved site settings (what differs from appSettings.ts). */
export interface DemoDb {
  nextId: number;
  apps: DemoApp[];
  users: DemoUser[];
  roles: DemoRole[];
  pages: DemoPage[];
  sessions: DemoSession[];
  settings: SettingsOverrides;
  permissions: DemoPermission[];
}

/** One call to the demo backend, as ApiService sends it. */
export interface DemoRequest {
  path: string;
  body: unknown;
  lang: string;
  method: string;
  token: string | null;
}

/** The answer of the demo backend: an HTTP status and the API's { success, message, data } body. */
export interface DemoReply {
  status: number;
  body: { success: boolean; message: string | null; data: unknown };
}

/** The demo login rules, the same values as appsettings.json of the API (Auth and Avatars sections). */
export interface DemoRules {
  maxNameLength: number;
  maxFailedLogins: number;
  lockoutMinutes: number;
  avatarMaxBytes: number;
  sessionDays: number;
  accessMinutes: number;
  passwordMinLength: number;
  passwordMaxLength: number;
  avatarTypes: string[];
}
