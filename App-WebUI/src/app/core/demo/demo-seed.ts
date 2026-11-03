import { DemoDb, DemoRules } from './demo.model';

/** Same values as appsettings.json of the API (Auth, Jwt and Avatars sections). */
export const DEMO_RULES: DemoRules = {
  maxNameLength: 100,
  maxFailedLogins: 5,
  lockoutMinutes: 15,
  avatarMaxBytes: 2097152,
  sessionDays: 30,
  accessMinutes: 15,
  passwordMinLength: 8,
  passwordMaxLength: 128,
  avatarTypes: ['.jpg', '.jpeg', '.png', '.webp'],
};

/**
 * A fresh demo database, the same rows as the INSERT scripts of the API branches: 008_Roles, 009_Users, 011_Apps, 012_UserAppAccess, 013_Pages and 014_RolePermissions.
 * Logins (SHA-256 of the password): superadmin@thakurg.com / Super@1234, admin@thakurg.com / Admin@1234, user@thakurg.com / User@1234.
 */
export const demoSeed = (now: string): DemoDb => ({
  nextId: 100,
  apps: [
    { code: 'khata', autoGrant: true },
    { code: 'tracker', autoGrant: true },
    { code: 'creta', autoGrant: false },
    { code: 'nexon', autoGrant: false },
    { code: 'youtube', autoGrant: false },
    { code: 'hr', autoGrant: false },
  ],
  roles: [
    { id: 1, code: 'super-admin', name: 'Super Admin', description: 'Full rights on every page and every app.', isSystem: true, isDefault: false, sortOrder: 1 },
    { id: 2, code: 'admin', name: 'Admin', description: 'Manages users, roles and settings, but cannot change super admins.', isSystem: true, isDefault: false, sortOrder: 2 },
    { id: 3, code: 'standard', name: 'Standard User', description: 'Every self sign-up. Own language, theme, password and page options only.', isSystem: true, isDefault: true, sortOrder: 3 },
  ],
  users: [
    { id: 1, email: 'superadmin@thakurg.com', passwordHash: '875c1163262a3170c4dae7ce2a32d17e7ee1e9a35911b2f9dee6b6b8984acbd6', displayName: 'Super Admin', language: 'en', roleId: 1, apps: ['khata', 'tracker', 'creta', 'nexon', 'youtube', 'hr'], hidden: [], avatar: null, avatarData: null, createdOn: now, lastLoginOn: null, failedLogins: 0, lockedUntil: null },
    { id: 2, email: 'admin@thakurg.com', passwordHash: 'bc78e58d55cde1346e68f8e5fe588dedf62fa457aa646a500a53347faff6ee24', displayName: 'Admin', language: 'en', roleId: 2, apps: ['khata', 'tracker', 'creta', 'nexon', 'youtube', 'hr'], hidden: [], avatar: null, avatarData: null, createdOn: now, lastLoginOn: null, failedLogins: 0, lockedUntil: null },
    { id: 3, email: 'user@thakurg.com', passwordHash: '1b992a2bb0984ad12a5efc86fb260801e275d71419c7b748b5ff33a497af8423', displayName: 'Standard User', language: 'en', roleId: 3, apps: ['khata', 'tracker', 'creta'], hidden: [], avatar: null, avatarData: null, createdOn: now, lastLoginOn: null, failedLogins: 0, lockedUntil: null },
  ],
  pages: [
    { id: 1, code: 'settings.account', hasAdd: false, hasDelete: false },
    { id: 2, code: 'settings.users', hasAdd: true, hasDelete: true },
    { id: 3, code: 'settings.roles', hasAdd: true, hasDelete: true },
    { id: 4, code: 'settings.permissions', hasAdd: true, hasDelete: true },
    { id: 5, code: 'settings.features', hasAdd: false, hasDelete: false },
    { id: 6, code: 'settings.connection', hasAdd: false, hasDelete: false },
    { id: 7, code: 'settings.services', hasAdd: false, hasDelete: false },
    { id: 8, code: 'settings.youtube', hasAdd: false, hasDelete: false },
    { id: 9, code: 'settings.json', hasAdd: false, hasDelete: false },
  ],
  // Super Admin and Admin: every right on every page. Standard User: only their own account tab (view and edit).
  permissions: [
    ...[1, 2].flatMap((roleId) => [1, 2, 3, 4, 5, 6, 7, 8, 9].map((pageId) => ({ id: (roleId - 1) * 9 + pageId, roleId, pageId, canView: true, canAdd: [2, 3, 4].includes(pageId), canEdit: true, canDelete: [2, 3, 4].includes(pageId) }))),
    { id: 19, roleId: 3, pageId: 1, canView: true, canAdd: false, canEdit: true, canDelete: false },
  ],
  sessions: [],
  settings: {},
});
