import { PageCode } from '../models/role.model';
import { KhataDemoDb } from './khata-demo.model';
import { TasksDemoDb } from './tasks-demo.model';
import { MailSetting } from '../models/mail.model';
import { SettingsOverrides } from '../models/app-settings.model';
import { ProfileDetails, ProfileLimits } from '../models/auth.model';

/** One text of the API's Messages table, in the three languages. */
export interface DemoText {
  en: string;
  hi: string;
  ar: string;
}

/** Message code → texts (INSERT/Common/001_Messages.sql). */
export type DemoMessages = Record<string, DemoText>;

/**
 * An account of the demo database (Users table). The password is kept as a SHA-256 hash; `avatarData` is the picture as a data: URL.
 * `archived` = IsActive false (cannot log in until activated), `deleted` = IsSoftDeleted (gone, can be restored). Both are missing in data saved by older builds.
 */
export interface DemoUser {
  id: number;
  email: string;
  apps: string[];
  roleId: number;
  hidden: string[];
  language: string;
  createdOn: string;
  deleted?: boolean;
  archived?: boolean;
  passwordHash: string;
  displayName: string;
  failedLogins: number;
  avatar: string | null;
  lockedUntil: number | null;
  avatarData: string | null;
  details?: ProfileDetails;
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

/**
 * A test login of the login page (TestLogins table). The API keeps the password encrypted; this browser keeps only its SHA-256, the same as a
 * user's password hash, so a tap logs in by comparing the two and the password itself is never stored.
 */
export interface DemoTestLogin {
  id: number;
  email: string;
  deleted: boolean;
  sortOrder: number;
  showOnLogin: boolean;
  passwordHash: string | null;
}

/** An app a user can be given (Apps table). `autoGrant` apps are given to every sign-up. */
export interface DemoApp {
  code: string;
  autoGrant: boolean;
}

/** A login session (UserSessions table). The token stands for both the access token and the refresh cookie of the API. `loggedInOn`: when the password login was made. */
export interface DemoSession {
  token: string;
  userId: number;
  expiresAt: number;
  loggedInOn?: number;
}

/** The whole demo database, kept in this browser's storage. `settings` are the saved site settings (what differs from appSettings.ts); `mail` the saved mail servers. */
export interface DemoDb {
  nextId: number;
  apps: DemoApp[];
  users: DemoUser[];
  roles: DemoRole[];
  pages: DemoPage[];
  mail?: MailSetting[];
  khata?: KhataDemoDb;
  tasks?: TasksDemoDb;
  sessions: DemoSession[];
  settings: SettingsOverrides;
  testLogins?: DemoTestLogin[];
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
  /** A file answer (photos, exports) instead of the JSON body. */
  file?: Blob;
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
  profileLimits: ProfileLimits;
}
