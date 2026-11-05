import { DemoDb, DemoRules } from './demo.model';
import { WhatsAppAccount } from '../../pages/config/whatsapp-card/whatsapp-card.model';
import { MailSetting } from '../models/mail.model';

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
  // Auth:Otp of the API: a 6-digit code for 10 minutes, 5 wrong tries, a new one after 60 seconds, for the apps that allow a code login.
  otp: { codeLength: 6, codeMinutes: 10, maxAttempts: 5, resendSeconds: 60, apps: ['khata', 'tracker', 'tasks'] },
  // Profile:Limits of the API (the SnapKhata profile's mobile number, address and company).
  profileLimits: { cityLength: 100, stateLength: 100, mobileLength: 20, addressLength: 200, countryLength: 100, postalCodeLength: 20, companyNameLength: 150, companyEmailLength: 256, companyPhoneLength: 20, companyTaxIdLength: 30, companyAddressLength: 500 },
};

/** A mail server profile never saved starts from these, as the API starts from appsettings Email:Smtp (no host = mail is off). */
/** The WhatsApp account before it is saved, as the API starts from appsettings WhatsApp (no token = no message is sent). */
export const DEMO_WHATSAPP: WhatsAppAccount = { enabled: false, apiVersion: 'v21.0', templateName: '', phoneNumberId: '', hasAccessToken: false, templateLanguage: 'en', businessAccountId: null };

export const DEMO_MAIL: Omit<MailSetting, 'purpose'> = { host: '', port: 587, enabled: false, fromName: 'Thakurg', userName: '', fromAddress: 'no-reply@thakurg.com', hasPassword: false, security: 'starttls' };

/**
 * A fresh demo database, the same rows as the INSERT scripts of the API branches: 008_Roles, 009_Users, 011_Apps, 012_UserAppAccess, 013_Pages and 014_RolePermissions.
 * The passwords of the seeded accounts are kept as SHA-256 hashes only (the plain passwords are in the comment of INSERT/Common/009_Users.sql of the API branches).
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
    { code: 'tasks', autoGrant: false },
  ],
  roles: [
    { id: 1, code: 'super-admin', name: 'Super Admin', description: 'Full rights on every page and every app.', isSystem: true, isDefault: false, sortOrder: 1 },
    { id: 2, code: 'admin', name: 'Admin', description: 'Manages users, roles and settings, but cannot change super admins.', isSystem: true, isDefault: false, sortOrder: 2 },
    { id: 3, code: 'standard', name: 'Standard User', description: 'Every self sign-up. Own language, theme, password and page options only.', isSystem: true, isDefault: true, sortOrder: 3 },
  ],
  users: [
    { id: 1, email: 'superadmin@thakurg.com', passwordHash: '875c1163262a3170c4dae7ce2a32d17e7ee1e9a35911b2f9dee6b6b8984acbd6', displayName: 'Super Admin', language: 'en', roleId: 1, apps: ['khata', 'tracker', 'creta', 'nexon', 'youtube', 'hr'], hidden: [], avatar: null, avatarData: null, createdOn: now, lastLoginOn: null, failedLogins: 0, lockedUntil: null, showOnLogin: false },
    { id: 2, email: 'admin@thakurg.com', passwordHash: 'bc78e58d55cde1346e68f8e5fe588dedf62fa457aa646a500a53347faff6ee24', displayName: 'Admin', language: 'en', roleId: 2, apps: ['khata', 'tracker', 'creta', 'nexon', 'youtube', 'hr'], hidden: [], avatar: null, avatarData: null, createdOn: now, lastLoginOn: null, failedLogins: 0, lockedUntil: null, showOnLogin: false },
    { id: 3, email: 'user@thakurg.com', passwordHash: '1b992a2bb0984ad12a5efc86fb260801e275d71419c7b748b5ff33a497af8423', displayName: 'Standard User', language: 'en', roleId: 3, apps: ['khata', 'tracker', 'creta'], hidden: [], avatar: null, avatarData: null, createdOn: now, lastLoginOn: null, failedLogins: 0, lockedUntil: null, showOnLogin: false },
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
