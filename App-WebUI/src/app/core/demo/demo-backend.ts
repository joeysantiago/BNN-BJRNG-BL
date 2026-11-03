import { FEATURES } from '../features';
import { DemoFailure } from './demo-failure';
import { randomToken, sha256 } from './demo-hash';
import { DEMO_MESSAGES } from './demo-messages';
import { APP_SETTINGS } from '../../appSettings';
import { DEMO_MAIL, DEMO_RULES, demoSeed } from './demo-seed';
import { AuthUser, ProfileDetails, UserStatus } from '../models/auth.model';
import { SettingsOverrides } from '../models/app-settings.model';
import { MailPurpose, MailSecurity, MailSetting } from '../models/mail.model';
import { RoleForm, RoleInfo, RolePermission } from '../models/role.model';
import { DemoDb, DemoMessages, DemoPermission, DemoReply, DemoRequest, DemoRole, DemoUser } from './demo.model';

const DB_KEY = 'thakurg-demo-db';
const SESSION_KEY = 'thakurg-demo-session';
/** Where the settings page of earlier Mojito builds kept its changes; read once so they are not lost. */
const OLD_SETTINGS_KEY = 'thakurg-settings';
const EMAIL = /^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$/;
const ROLE_CODE = /^[a-z][a-z0-9-]{1,49}$/;
const LANGS = ['en', 'hi', 'ar'];
const MAIL_PURPOSES: MailPurpose[] = ['otp', 'notification'];
const MAIL_SECURITIES: MailSecurity[] = ['starttls', 'ssl', 'none'];

/**
 * The API of the login, profile and Settings pages, run inside the browser for the Angular-only Mojito demo. It follows the rules of the API branches
 * (AuthService, UserAccessService, RoleService, RolePermissionService and SettingsController) and answers with the same codes and texts.
 * The data lives in this browser's storage (localStorage), so it is shared by the open tabs and stays after a reload. Nothing leaves the browser.
 */
export class DemoBackend {
  private memory: DemoDb | null = null;
  /** The texts of the SnapKhata part, added when it first loads. */
  private extraMessages: DemoMessages = {};

  // #region Public Methods

  /** The profile picture of a user as a data: URL, or null. */
  avatar(userId: number): string | null {
    return this.load().users.find((u) => u.id === userId)?.avatarData ?? null;
  }

  /** The saved site settings, like GET /settings but at once. */
  settings(): SettingsOverrides {
    return this.load().settings;
  }

  async handle(req: DemoRequest): Promise<DemoReply> {
    try {
      const db = this.load();
      const data: { code?: string; args?: (string | number)[]; data?: unknown; file?: Blob } = await this.route(db, req);
      this.store(db);
      return { status: 200, body: { success: true, message: data.code ? this.text(data.code, req.lang, data.args ?? []) : null, data: data.data ?? null }, file: data.file };
    } catch (e) {
      const f = e instanceof DemoFailure ? e : new DemoFailure(500, 'UNEXPECTED_ERROR');
      return { status: f.status, body: { success: false, message: this.text(f.code, req.lang, f.args), data: null } };
    }
  }

  // #endregion

  // #region Private Methods

  private now(): string {
    return new Date().toISOString();
  }

  private next(db: DemoDb): number {
    return db.nextId++;
  }

  private load(): DemoDb {
    if (this.memory)
      return this.memory;
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw)
        return JSON.parse(raw) as DemoDb;
      const db = demoSeed(this.now());
      db.settings = JSON.parse(localStorage.getItem(OLD_SETTINGS_KEY) ?? '{}') as SettingsOverrides;
      localStorage.removeItem(OLD_SETTINGS_KEY);
      return db;
    } catch {
      // No storage (prerender, or blocked by the browser): the demo keeps its data in memory until the page is closed.
      this.memory = demoSeed(this.now());
      return this.memory;
    }
  }

  private store(db: DemoDb): void {
    if (this.memory)
      return;
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch {
      this.memory = db;
    }
  }

  private role(db: DemoDb, id: number): DemoRole | null {
    return db.roles.find((r) => r.id === id) ?? null;
  }

  private isAdmin(db: DemoDb, user: DemoUser): boolean {
    const code = this.role(db, user.roleId)?.code;
    return code === 'super-admin' || code === 'admin';
  }

  private isSuper(db: DemoDb, user: DemoUser): boolean {
    return this.role(db, user.roleId)?.code === 'super-admin';
  }

  /** May log in: neither archived (IsActive = false) nor deleted (IsSoftDeleted). Data saved by older builds has neither flag. */
  private live(user: DemoUser): boolean {
    return !user.archived && !user.deleted;
  }

  /** Users that may log in and hold a role, for the "last super admin" rule (WhereActive in the API). */
  private liveInRole(db: DemoDb, roleId: number): number {
    return db.users.filter((u) => u.roleId === roleId && this.live(u)).length;
  }

  /** The text of a message code in the visitor's language, with {0}, {1} filled in. */
  private text(code: string, lang: string, args: (string | number)[]): string {
    const texts = DEMO_MESSAGES[code] ?? this.extraMessages[code] ?? DEMO_MESSAGES['UNEXPECTED_ERROR'];
    const text = texts[lang as keyof typeof texts] ?? texts.en;
    return args.reduce<string>((t, a, i) => t.split(`{${i}}`).join(String(a)), text);
  }

  private permissions(db: DemoDb, roleId: number): string[] {
    const actions = ['view', 'add', 'edit', 'delete'] as const;
    const flags = { view: 'canView', add: 'canAdd', edit: 'canEdit', delete: 'canDelete' } as const;
    return db.permissions.filter((p) => p.roleId === roleId).sort((a, b) => a.pageId - b.pageId).flatMap((p) => {
      const page = db.pages.find((x) => x.id === p.pageId);
      return page ? actions.filter((a) => p[flags[a]]).map((a) => `${page.code}:${a}`) : [];
    });
  }

  /** UserDto of the API. The admin list leaves out the rights and the hidden options. */
  private dto(db: DemoDb, user: DemoUser, full = true): AuthUser {
    const role = this.role(db, user.roleId);
    const order = db.apps.map((a) => a.code);
    return {
      id: user.id,
      email: user.email,
      apps: [...user.apps].sort((a, b) => order.indexOf(a) - order.indexOf(b)),
      roleId: user.roleId,
      isAdmin: this.isAdmin(db, user),
      language: user.language,
      roleCode: role?.code ?? '',
      roleName: role?.name ?? '',
      createdOn: user.createdOn,
      displayName: user.displayName,
      isDeleted: !!user.deleted,
      isArchived: !!user.archived && !user.deleted,
      avatar: user.avatar,
      permissions: full ? this.permissions(db, user.roleId) : [],
      hiddenFeatures: full ? user.hidden : [],
      lastLoginOn: user.lastLoginOn,
    };
  }

  private roleDto(db: DemoDb, role: DemoRole): RoleInfo {
    return { ...role, userCount: db.users.filter((u) => u.roleId === role.id && !u.deleted).length };
  }

  private sortedRoles(db: DemoDb): RoleInfo[] {
    return [...db.roles].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)).map((r) => this.roleDto(db, r));
  }

  private permissionDto(db: DemoDb, p: DemoPermission): RolePermission {
    return { ...p, pageCode: db.pages.find((x) => x.id === p.pageId)!.code };
  }

  /** The logged-in caller, or 401 AUTH_SESSION_INVALID. An archived or deleted account has no session any more. */
  private caller(db: DemoDb, token: string | null): DemoUser {
    const session = db.sessions.find((s) => s.token === token && s.expiresAt > Date.now());
    const user = session ? db.users.find((u) => u.id === session.userId && this.live(u)) : undefined;
    if (!user)
      throw new DemoFailure(401, 'AUTH_SESSION_INVALID');
    return user;
  }

  /** [HasPermission(page, action)]: a super admin has every right, anyone else needs the row. 403 AUTH_FORBIDDEN otherwise. */
  private require(db: DemoDb, token: string | null, right: string): DemoUser {
    const user = this.caller(db, token);
    if (!this.isSuper(db, user) && !this.permissions(db, user.roleId).includes(right))
      throw new DemoFailure(403, 'AUTH_FORBIDDEN');
    return user;
  }

  private email(value: unknown): string | null {
    const e = String(value ?? '').trim().toLowerCase();
    return e.length <= 256 && EMAIL.test(e) ? e : null;
  }

  private checkPassword(value: unknown): string {
    const p = typeof value === 'string' ? value : '';
    if (p.length < DEMO_RULES.passwordMinLength || p.length > DEMO_RULES.passwordMaxLength)
      throw new DemoFailure(400, 'AUTH_PASSWORD_WEAK', [DEMO_RULES.passwordMinLength]);
    return p;
  }

  /** A blank name becomes the part of the e-mail before @. */
  private displayName(value: unknown, email: string): string {
    const name = String(value ?? '').trim() || email.split('@')[0];
    if (name.length > DEMO_RULES.maxNameLength)
      throw new DemoFailure(400, 'AUTH_PROFILE_INVALID', [DEMO_RULES.maxNameLength]);
    return name;
  }

  private checkApps(db: DemoDb, value: unknown): string[] {
    const codes = [...new Set((Array.isArray(value) ? value : []).map(String))];
    const unknown = codes.find((c) => !db.apps.some((a) => a.code === c));
    if (unknown)
      throw new DemoFailure(400, 'AUTH_APP_UNKNOWN', [unknown]);
    return codes;
  }

  /** Only a super admin may give, change or take away the super admin role, and the last super admin stays. */
  private superGuard(db: DemoDb, caller: DemoUser, from: DemoRole | null, to: DemoRole | null): void {
    const wasSuper = from?.code === 'super-admin';
    const isSuper = to?.code === 'super-admin';
    if ((wasSuper || isSuper) && !this.isSuper(db, caller))
      throw new DemoFailure(403, 'ROLE_SUPER_ADMIN_ONLY');
    if (wasSuper && !isSuper && this.liveInRole(db, from!.id) <= 1)
      throw new DemoFailure(409, 'AUTH_LAST_ADMIN');
  }

  /** A user may switch off the options of the header and the speed test, and of the apps they can open (administrators open every app). */
  private ownFeature(db: DemoDb, user: DemoUser, code: string): boolean {
    const has = (apps: string[]) => this.isAdmin(db, user) || apps.some((a) => user.apps.includes(a));
    if (code.startsWith('site.') || code.startsWith('speed.'))
      return true;
    if (code.startsWith('yt.'))
      return has(['youtube']);
    return code.startsWith('audio.') && has(['creta', 'nexon']);
  }

  /** A new session: login, sign-up and refresh answer { accessToken, expiresInSeconds, user }. The token is kept as the refresh cookie of this browser. */
  private signIn(db: DemoDb, user: DemoUser): unknown {
    const token = randomToken();
    db.sessions = db.sessions.filter((s) => s.expiresAt > Date.now());
    db.sessions.push({ token, userId: user.id, expiresAt: Date.now() + DEMO_RULES.sessionDays * 86400000 });
    this.keepSession(token);
    return { accessToken: token, expiresInSeconds: DEMO_RULES.accessMinutes * 60, user: this.dto(db, user) };
  }

  private keepSession(token: string | null): void {
    try {
      if (token)
        localStorage.setItem(SESSION_KEY, token);
      else
        localStorage.removeItem(SESSION_KEY);
    } catch {
      /* storage blocked: the login lasts until the page is closed */
    }
  }

  private savedSession(): string | null {
    try {
      return localStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  }

  private async hash(password: string): Promise<string> {
    return sha256(password);
  }

  private async route(db: DemoDb, req: DemoRequest): Promise<{ code?: string; args?: (string | number)[]; data?: unknown; file?: Blob }> {
    const [path, query] = req.path.split('?');
    const body = (req.body ?? {}) as Record<string, unknown>;
    // An id may be followed by an action (/admin/users/5/archive); a mail server is named by its purpose (/admin/mail/otp).
    const id = Number(/\/(\d+)(?:\/|$)/.exec(path)?.[1]);
    const purpose = path.split('/')[3] as MailPurpose;
    const key = `${req.method} ${path.replace(/\/\d+(?=\/|$)/g, '/{id}').replace(/^\/admin\/mail\/[a-z]+/, '/admin/mail/{purpose}')}`;
    switch (key) {
      case 'POST /auth/login':
        return { data: await this.login(db, body) };
      case 'POST /auth/register':
        return { data: await this.register(db, body) };
      case 'POST /auth/refresh':
        return { data: this.refresh(db) };
      case 'POST /auth/logout':
        db.sessions = db.sessions.filter((s) => s.token !== req.token && s.token !== this.savedSession());
        this.keepSession(null);
        return { code: 'AUTH_LOGGED_OUT' };
      case 'PUT /auth/me':
        return this.updateMe(db, this.caller(db, req.token), body);
      case 'DELETE /auth/me':
        return this.deleteMe(db, this.caller(db, req.token));
      case 'PUT /auth/me/password':
        return this.changePassword(db, this.caller(db, req.token), req.token, body);
      case 'PUT /auth/me/features':
        return this.updateFeatures(db, this.require(db, req.token, 'settings.account:edit'), body);
      case 'PUT /auth/avatar':
        return this.uploadAvatar(db, this.caller(db, req.token), req.body);
      case 'DELETE /auth/avatar': {
        const user = this.caller(db, req.token);
        user.avatar = null;
        user.avatarData = null;
        return { code: 'AUTH_AVATAR_REMOVED', data: this.dto(db, user) };
      }
      case 'GET /settings':
        return { data: db.settings };
      case 'PUT /settings':
        return this.saveSettings(db, req.token, body as SettingsOverrides);
      case 'GET /admin/users':
        this.require(db, req.token, 'settings.users:view');
        return { data: { apps: db.apps, roles: this.sortedRoles(db), users: this.usersBy(db, new URLSearchParams(query).get('status')).map((u) => this.dto(db, u, false)) } };
      case 'PUT /admin/users/{id}/archive':
        return this.setActive(db, this.require(db, req.token, 'settings.users:edit'), id, false);
      case 'PUT /admin/users/{id}/activate':
        return this.setActive(db, this.require(db, req.token, 'settings.users:edit'), id, true);
      case 'PUT /admin/users/{id}/restore':
        return this.restoreUser(db, this.require(db, req.token, 'settings.users:edit'), id);
      case 'GET /admin/mail':
        this.superCaller(db, req.token);
        return { data: MAIL_PURPOSES.map((p) => this.mailOf(db, p)) };
      case 'PUT /admin/mail/{purpose}':
        this.superCaller(db, req.token);
        return this.saveMail(db, purpose, body);
      case 'POST /admin/mail/{purpose}/test':
        return this.testMail(db, this.superCaller(db, req.token), purpose);
      case 'POST /admin/users':
        return this.createUser(db, this.require(db, req.token, 'settings.users:add'), body);
      case 'PUT /admin/users/{id}':
        return this.updateUser(db, this.require(db, req.token, 'settings.users:edit'), id, body);
      case 'DELETE /admin/users/{id}':
        return this.deleteUser(db, this.require(db, req.token, 'settings.users:delete'), id);
      case 'GET /admin/roles':
        this.require(db, req.token, 'settings.roles:view');
        return { data: this.sortedRoles(db) };
      case 'POST /admin/roles':
        this.require(db, req.token, 'settings.roles:add');
        return this.saveRole(db, null, body as unknown as RoleForm);
      case 'PUT /admin/roles/{id}':
        return this.saveRole(db, this.require(db, req.token, 'settings.roles:edit'), body as unknown as RoleForm, id);
      case 'DELETE /admin/roles/{id}':
        this.require(db, req.token, 'settings.roles:delete');
        return this.deleteRole(db, id);
      case 'GET /admin/role-permissions':
        this.require(db, req.token, 'settings.permissions:view');
        return { data: this.rights(db, Number(new URLSearchParams(query).get('roleId')) || 0) };
      case 'POST /admin/role-permissions':
        return this.addRight(db, this.require(db, req.token, 'settings.permissions:add'), body);
      case 'PUT /admin/role-permissions/{id}':
        return this.updateRight(db, this.require(db, req.token, 'settings.permissions:edit'), id, body);
      case 'DELETE /admin/role-permissions/{id}':
        return this.deleteRight(db, this.require(db, req.token, 'settings.permissions:delete'), id);
      case 'GET /auth/me/details':
        return { data: this.detailsOf(this.caller(db, req.token)) };
      case 'PUT /auth/me/details':
        return this.saveDetails(db, this.caller(db, req.token), body);
      default:
        if (path.startsWith('/khata/'))
          return this.khata(db, req, path, query ?? '');
        throw new DemoFailure(404, 'UNEXPECTED_ERROR');
    }
  }

  /**
   * Wrong passwords count up; the fifth locks the account for 15 minutes. An archived or deleted account is told why it cannot log in
   * ("your account is archived"), but only with the right password, so the answer never shows which e-mails exist.
   */
  private async login(db: DemoDb, body: Record<string, unknown>): Promise<unknown> {
    const email = this.email(body['email']);
    const user = email ? db.users.find((u) => u.email === email && this.live(u)) : undefined;
    const inactive = email && !user ? db.users.find((u) => u.email === email) : undefined;
    if (inactive && (await this.hash(String(body['password'] ?? ''))) === inactive.passwordHash)
      throw new DemoFailure(403, inactive.deleted ? 'AUTH_ACCOUNT_CLOSED' : 'AUTH_ACCOUNT_ARCHIVED');
    if (!user)
      throw new DemoFailure(401, 'AUTH_LOGIN_INVALID');
    if (user.lockedUntil && user.lockedUntil > Date.now())
      throw new DemoFailure(423, 'AUTH_LOCKED', [Math.ceil((user.lockedUntil - Date.now()) / 60000)]);
    if ((await this.hash(String(body['password'] ?? ''))) !== user.passwordHash) {
      user.failedLogins++;
      user.lockedUntil = user.failedLogins >= DEMO_RULES.maxFailedLogins ? Date.now() + DEMO_RULES.lockoutMinutes * 60000 : null;
      if (user.lockedUntil)
        user.failedLogins = 0;
      this.store(db);
      throw new DemoFailure(401, 'AUTH_LOGIN_INVALID');
    }
    user.failedLogins = 0;
    user.lockedUntil = null;
    user.lastLoginOn = this.now();
    return this.signIn(db, user);
  }

  /** A sign-up gets the default role and the apps every new account gets (AutoGrant). */
  private async register(db: DemoDb, body: Record<string, unknown>): Promise<unknown> {
    const email = this.email(body['email']);
    if (!email)
      throw new DemoFailure(400, 'AUTH_EMAIL_INVALID');
    if (db.users.some((u) => u.email === email))
      throw new DemoFailure(409, 'AUTH_EMAIL_TAKEN');
    const displayName = this.displayName(body['displayName'], email);
    const role = [...db.roles].sort((a, b) => a.sortOrder - b.sortOrder).find((r) => r.isDefault);
    if (!role)
      throw new DemoFailure(500, 'ROLE_NOT_FOUND');
    const password = this.checkPassword(body['password']);
    const now = this.now();
    const user: DemoUser = { id: this.next(db), email, passwordHash: await this.hash(password), displayName, language: 'en', roleId: role.id, apps: db.apps.filter((a) => a.autoGrant).map((a) => a.code), hidden: [], avatar: null, avatarData: null, createdOn: now, lastLoginOn: now, failedLogins: 0, lockedUntil: null };
    db.users.push(user);
    return this.signIn(db, user);
  }

  /** The saved login of this browser (the refresh cookie of the API). */
  private refresh(db: DemoDb): unknown {
    const token = this.savedSession();
    const session = db.sessions.find((s) => s.token === token && s.expiresAt > Date.now());
    const user = session ? db.users.find((u) => u.id === session.userId && this.live(u)) : undefined;
    if (!session || !user)
      throw new DemoFailure(401, 'AUTH_SESSION_INVALID');
    session.expiresAt = Date.now() + DEMO_RULES.sessionDays * 86400000;
    return { accessToken: session.token, expiresInSeconds: DEMO_RULES.accessMinutes * 60, user: this.dto(db, user) };
  }

  /**
   * SnapKhata's calls (/khata/...), answered by its own part of the demo backend (khata-demo.ts). It is loaded with the first such call, so the rest of the
   * site does not carry it. The SnapKhata app needs the khata app, as KhataProfileFilter and the khata policy of the API need it.
   */
  private async khata(db: DemoDb, req: DemoRequest, path: string, query: string): Promise<{ code?: string; args?: (string | number)[]; data?: unknown; file?: Blob }> {
    const user = this.caller(db, req.token);
    if (!this.isAdmin(db, user) && !user.apps.includes('khata'))
      throw new DemoFailure(403, 'AUTH_FORBIDDEN');
    const { KhataDemo, KHATA_DEMO_MESSAGES } = await import('./khata-demo');
    this.extraMessages = KHATA_DEMO_MESSAGES;
    const demo = new KhataDemo(db, user, () => this.next(db), (code, args = []) => this.text(code, req.lang, args));
    return demo.route(req.method, path, query, req.body, this.isSuper(db, user));
  }

  /** The account's mobile number, address and company (UserProfiles), with the field limits of Profile:Limits. */
  private detailsOf(user: DemoUser): ProfileDetails {
    const empty: ProfileDetails = { city: null, state: null, mobile: null, country: null, postalCode: null, companyName: null, addressLine1: null, addressLine2: null, companyEmail: null, companyPhone: null, companyTaxId: null, companyAddress: null };
    return { ...empty, ...user.details, limits: DEMO_RULES.profileLimits };
  }

  /** Each field within its limit; the e-mail and phone numbers valid when given; a mobile number used by another account is refused. */
  private saveDetails(db: DemoDb, user: DemoUser, body: unknown): { code: string; data: ProfileDetails } {
    const form = (body ?? {}) as Record<string, unknown>;
    const limits = DEMO_RULES.profileLimits;
    const max: Record<string, number> = { city: limits.cityLength, state: limits.stateLength, mobile: limits.mobileLength, country: limits.countryLength, postalCode: limits.postalCodeLength, companyName: limits.companyNameLength, addressLine1: limits.addressLength, addressLine2: limits.addressLength, companyEmail: limits.companyEmailLength, companyPhone: limits.companyPhoneLength, companyTaxId: limits.companyTaxIdLength, companyAddress: limits.companyAddressLength };
    const details = Object.fromEntries(Object.keys(max).map((k) => [k, String(form[k] ?? '').trim() || null])) as Record<string, string | null>;
    const phone = /^\+?[\d\s-]{7,20}$/;
    if (Object.entries(details).some(([k, v]) => (v?.length ?? 0) > max[k]) || (details['mobile'] && !phone.test(details['mobile'])) || (details['companyPhone'] && !phone.test(details['companyPhone'])) || (details['companyEmail'] && !this.email(details['companyEmail'])))
      throw new DemoFailure(400, 'PROFILE_DETAILS_INVALID');
    if (details['mobile'] && db.users.some((u) => u.id !== user.id && u.details?.mobile === details['mobile']))
      throw new DemoFailure(409, 'PROFILE_MOBILE_TAKEN');
    user.details = details as unknown as ProfileDetails;
    return { code: 'PROFILE_DETAILS_SAVED', data: this.detailsOf(user) };
  }

  private updateMe(db: DemoDb, user: DemoUser, body: Record<string, unknown>): { code: string; data: AuthUser } {
    const name = String(body['displayName'] ?? '').trim();
    const lang = String(body['language'] ?? '');
    if (!name || name.length > DEMO_RULES.maxNameLength || !LANGS.includes(lang))
      throw new DemoFailure(400, 'AUTH_PROFILE_INVALID', [DEMO_RULES.maxNameLength]);
    user.displayName = name;
    user.language = lang;
    return { code: 'AUTH_PROFILE_SAVED', data: this.dto(db, user) };
  }

  /** The user deletes their own account (soft delete) and is logged out on every device. The last super admin cannot. */
  private deleteMe(db: DemoDb, user: DemoUser): { code: string } {
    if (this.isSuper(db, user) && this.liveInRole(db, user.roleId) <= 1)
      throw new DemoFailure(409, 'AUTH_LAST_ADMIN');
    user.deleted = true;
    db.sessions = db.sessions.filter((s) => s.userId !== user.id);
    this.keepSession(null);
    return { code: 'AUTH_ACCOUNT_DELETED' };
  }

  /** Every other session of the account ends; this one stays. */
  private async changePassword(db: DemoDb, user: DemoUser, token: string | null, body: Record<string, unknown>): Promise<{ code: string }> {
    if ((await this.hash(String(body['currentPassword'] ?? ''))) !== user.passwordHash)
      throw new DemoFailure(400, 'AUTH_PASSWORD_WRONG');
    user.passwordHash = await this.hash(this.checkPassword(body['newPassword']));
    db.sessions = db.sessions.filter((s) => s.userId !== user.id || s.token === token);
    return { code: 'AUTH_PASSWORD_CHANGED' };
  }

  private updateFeatures(db: DemoDb, user: DemoUser, body: Record<string, unknown>): { code: string; data: AuthUser } {
    const hidden = [...new Set((Array.isArray(body['hidden']) ? body['hidden'] : []).map(String))];
    const bad = hidden.find((c) => !this.ownFeature(db, user, c) || !FEATURES.some((f) => f.id === c));
    if (bad)
      throw new DemoFailure(400, 'AUTH_FEATURE_UNKNOWN', [bad]);
    user.hidden = hidden;
    return { code: 'AUTH_FEATURES_SAVED', data: this.dto(db, user) };
  }

  /** JPG, PNG or WebP up to 2 MB; the first bytes must match the type, as the API checks. */
  private async uploadAvatar(db: DemoDb, user: DemoUser, body: unknown): Promise<{ code: string; data: AuthUser }> {
    const file = body instanceof FormData ? body.get('file') : null;
    const ext = file instanceof File ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase() : '';
    const invalid = new DemoFailure(400, 'AUTH_AVATAR_INVALID', [Math.max(1, Math.floor(DEMO_RULES.avatarMaxBytes / 1048576))]);
    if (!(file instanceof File) || file.size <= 0 || file.size > DEMO_RULES.avatarMaxBytes || !DEMO_RULES.avatarTypes.includes(ext))
      throw invalid;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
    const ok = ext === '.png' ? bytes[0] === 0x89 && ascii(1, 4) === 'PNG' : ext === '.webp' ? ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP' : bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (!ok)
      throw invalid;
    const type = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    let binary = '';
    for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
    user.avatar = `${user.id}-${Date.now()}${ext}`;
    user.avatarData = `data:${type};base64,${btoa(binary)}`;
    return { code: 'AUTH_AVATAR_SAVED', data: this.dto(db, user) };
  }

  /** Each part needs its own edit right; values are checked against appSettings.ts and only what differs from it is kept. */
  private saveSettings(db: DemoDb, token: string | null, body: SettingsOverrides): { code: string; data: SettingsOverrides } {
    const user = this.caller(db, token);
    const may = (page: string) => this.isSuper(db, user) || this.permissions(db, user.roleId).includes(`${page}:edit`);
    const parts: [unknown, string][] = [[body.features, 'settings.features'], [body.connection, 'settings.connection'], [body.services, 'settings.services'], [body.youtube, 'settings.youtube']];
    if (parts.some(([part, page]) => part !== undefined && !may(page)))
      throw new DemoFailure(403, 'AUTH_FORBIDDEN');
    const d = APP_SETTINGS;
    const secs = body.services?.refreshSeconds;
    const badKey = <T extends object>(src: object | undefined, base: T) => Object.keys(src ?? {}).some((k) => !(k in base));
    if (badKey(body.features, d.features) || badKey(body.connection?.fields, d.connection.fields) || badKey(body.youtube, d.youtube) || Object.keys(body.services?.items ?? {}).some((k) => !d.services.items.some((s) => s.id === k)) || (secs !== undefined && (secs < 0 || secs > 3600)))
      throw new DemoFailure(400, 'SETTINGS_INVALID');
    const s = db.settings;
    const pick = <T extends object>(src: Partial<T> | undefined, base: T, saved: Partial<T> | undefined): Partial<T> | undefined => {
      const merged: Partial<T> = { ...saved, ...src };
      for (const k of Object.keys(merged) as (keyof T)[]) if (merged[k] === base[k]) delete merged[k];
      return Object.keys(merged).length ? merged : undefined;
    };
    const out: SettingsOverrides = {};
    out.features = pick(body.features, d.features, s.features);
    out.youtube = pick(body.youtube, d.youtube, s.youtube);
    const fields = pick(body.connection?.fields, d.connection.fields, s.connection?.fields);
    const enabled = body.connection?.enabled ?? s.connection?.enabled;
    if (fields || (enabled !== undefined && enabled !== d.connection.enabled))
      out.connection = { ...(fields ? { fields } : {}), ...(enabled !== undefined && enabled !== d.connection.enabled ? { enabled } : {}) };
    const items = { ...s.services?.items, ...body.services?.items };
    for (const item of d.services.items) if (items[item.id] === item.enabled) delete items[item.id];
    const svcOn = body.services?.enabled ?? s.services?.enabled;
    const refresh = body.services?.refreshSeconds ?? s.services?.refreshSeconds;
    const services: NonNullable<SettingsOverrides['services']> = {};
    if (svcOn !== undefined && svcOn !== d.services.enabled)
      services.enabled = svcOn;
    if (refresh !== undefined && refresh !== d.services.refreshSeconds)
      services.refreshSeconds = refresh;
    if (Object.keys(items).length)
      services.items = items;
    if (Object.keys(services).length)
      out.services = services;
    db.settings = JSON.parse(JSON.stringify(out)) as SettingsOverrides;
    return { code: 'SETTINGS_SAVED', data: db.settings };
  }

  private createUser(db: DemoDb, caller: DemoUser, body: Record<string, unknown>): Promise<{ code: string; data: AuthUser }> {
    const email = this.email(body['email']);
    if (!email)
      throw new DemoFailure(400, 'AUTH_EMAIL_INVALID');
    if (db.users.some((u) => u.email === email))
      throw new DemoFailure(409, 'AUTH_EMAIL_TAKEN');
    const displayName = this.displayName(body['displayName'], email);
    const password = this.checkPassword(body['password']);
    const role = this.role(db, Number(body['roleId']));
    if (!role)
      throw new DemoFailure(400, 'ROLE_NOT_FOUND');
    this.superGuard(db, caller, null, role);
    const apps = this.checkApps(db, body['apps']);
    return this.hash(password).then((passwordHash) => {
      const user: DemoUser = { id: this.next(db), email, passwordHash, displayName, language: 'en', roleId: role.id, apps, hidden: [], avatar: null, avatarData: null, createdOn: this.now(), lastLoginOn: null, failedLogins: 0, lockedUntil: null };
      db.users.push(user);
      return { code: 'AUTH_USER_CREATED', data: this.dto(db, user, false) };
    });
  }

  /** ?status=active | archived | deleted | all; none = active and archived, as the API answers. Sorted by e-mail. */
  private usersBy(db: DemoDb, status: string | null): DemoUser[] {
    const tests: Record<UserStatus, (u: DemoUser) => boolean> = { all: () => true, active: (u) => this.live(u), archived: (u) => !!u.archived && !u.deleted, deleted: (u) => !!u.deleted };
    const test = tests[status as UserStatus] ?? ((u: DemoUser) => !u.deleted);
    return db.users.filter(test).sort((a, b) => a.email.localeCompare(b.email));
  }

  private updateUser(db: DemoDb, caller: DemoUser, id: number, body: Record<string, unknown>): { code: string; data: AuthUser } {
    const user = db.users.find((u) => u.id === id && !u.deleted);
    if (!user)
      throw new DemoFailure(404, 'AUTH_USER_NOT_FOUND');
    const role = this.role(db, Number(body['roleId']));
    if (!role)
      throw new DemoFailure(400, 'ROLE_NOT_FOUND');
    const name = String(body['displayName'] ?? '').trim() || user.displayName;
    if (name.length > DEMO_RULES.maxNameLength)
      throw new DemoFailure(400, 'AUTH_PROFILE_INVALID', [DEMO_RULES.maxNameLength]);
    if (user.id === caller.id && role.id !== user.roleId)
      throw new DemoFailure(409, 'AUTH_OWN_ACCOUNT');
    this.superGuard(db, caller, this.role(db, user.roleId), role);
    user.apps = this.checkApps(db, body['apps']);
    user.roleId = role.id;
    user.displayName = name;
    return { code: 'AUTH_ACCESS_SAVED', data: this.dto(db, user, false) };
  }

  /** A soft delete, as in the API: the row stays (its e-mail stays taken) and can be restored; the user is logged out everywhere. */
  private deleteUser(db: DemoDb, caller: DemoUser, id: number): { code: string } {
    const user = db.users.find((u) => u.id === id && !u.deleted);
    if (!user)
      throw new DemoFailure(404, 'AUTH_USER_NOT_FOUND');
    if (user.id === caller.id)
      throw new DemoFailure(409, 'AUTH_OWN_ACCOUNT');
    this.superGuard(db, caller, this.role(db, user.roleId), null);
    user.deleted = true;
    db.sessions = db.sessions.filter((s) => s.userId !== id);
    return { code: 'AUTH_USER_DELETED' };
  }

  /** Archive (active = false) or activate. Nobody archives themselves; the last active super admin cannot be archived; an archived user is logged out. */
  private setActive(db: DemoDb, caller: DemoUser, id: number, active: boolean): { code: string } {
    const user = db.users.find((u) => u.id === id && !u.deleted);
    const code = active ? 'AUTH_USER_ACTIVATED' : 'AUTH_USER_ARCHIVED';
    if (!user)
      throw new DemoFailure(404, 'AUTH_USER_NOT_FOUND');
    if (user.id === caller.id)
      throw new DemoFailure(409, 'AUTH_OWN_ACCOUNT');
    if (!user.archived === active)
      return { code };
    const role = this.role(db, user.roleId);
    this.superGuard(db, caller, active ? null : role, active ? role : null);
    user.archived = !active;
    if (!active)
      db.sessions = db.sessions.filter((s) => s.userId !== id);
    return { code };
  }

  /** Brings a deleted user back; one who was archived before the delete stays archived. Only a super admin restores a super admin. */
  private restoreUser(db: DemoDb, caller: DemoUser, id: number): { code: string } {
    const user = db.users.find((u) => u.id === id && u.deleted);
    if (!user)
      throw new DemoFailure(404, 'AUTH_USER_NOT_FOUND');
    this.superGuard(db, caller, null, this.role(db, user.roleId));
    user.deleted = false;
    return { code: 'AUTH_USER_RESTORED' };
  }

  /** Add (no id) or change a role. Built-in roles keep their code; the default role can only move to another role, never be unset. */
  private saveRole(db: DemoDb, caller: DemoUser | null, form: RoleForm, id?: number): { code: string; data: RoleInfo } {
    const role = id === undefined ? null : this.role(db, id);
    if (id !== undefined && !role)
      throw new DemoFailure(404, 'ROLE_NOT_FOUND');
    if (role?.code === 'super-admin' && caller && !this.isSuper(db, caller))
      throw new DemoFailure(403, 'ROLE_SUPER_ADMIN_ONLY');
    const asked = String(form.code ?? '').trim();
    if (role?.isSystem && asked && asked !== role.code)
      throw new DemoFailure(409, 'ROLE_SYSTEM_LOCKED');
    const code = role?.isSystem ? role.code : asked;
    const name = String(form.name ?? '').trim();
    const description = String(form.description ?? '').trim() || null;
    if (!ROLE_CODE.test(code) || !name || name.length > 100 || (description?.length ?? 0) > 250)
      throw new DemoFailure(400, 'ROLE_INVALID', [50, 100, 250]);
    if (form.isDefault && code === 'super-admin')
      throw new DemoFailure(400, 'ROLE_DEFAULT_INVALID');
    if (role?.isDefault && !form.isDefault)
      throw new DemoFailure(409, 'ROLE_DEFAULT_REQUIRED');
    if (db.roles.some((r) => r.code === code && r.id !== role?.id))
      throw new DemoFailure(409, 'ROLE_CODE_TAKEN', [code]);
    const saved: DemoRole = role ?? { id: this.next(db), code, name, description, isSystem: false, isDefault: false, sortOrder: 0 };
    Object.assign(saved, { code, name, description, sortOrder: Number(form.sortOrder) || 0, isDefault: !!form.isDefault });
    if (!role)
      db.roles.push(saved);
    if (saved.isDefault)
      db.roles.filter((r) => r.id !== saved.id).forEach((r) => (r.isDefault = false));
    return { code: 'ROLE_SAVED', data: this.roleDto(db, saved) };
  }

  private deleteRole(db: DemoDb, id: number): { code: string } {
    const role = this.role(db, id);
    if (!role)
      throw new DemoFailure(404, 'ROLE_NOT_FOUND');
    if (role.isSystem)
      throw new DemoFailure(409, 'ROLE_SYSTEM_LOCKED');
    if (role.isDefault)
      throw new DemoFailure(409, 'ROLE_DEFAULT_REQUIRED');
    const users = db.users.filter((u) => u.roleId === id && !u.deleted).length;
    if (users)
      throw new DemoFailure(409, 'ROLE_IN_USE', [users]);
    db.roles = db.roles.filter((r) => r.id !== id);
    db.permissions = db.permissions.filter((p) => p.roleId !== id);
    return { code: 'ROLE_DELETED' };
  }

  /** The rights of one role (0 = the first role), with every role and page. */
  private rights(db: DemoDb, roleId: number): unknown {
    const roles = this.sortedRoles(db);
    const role = roleId ? roles.find((r) => r.id === roleId) : roles[0];
    if (!role)
      throw new DemoFailure(404, 'ROLE_NOT_FOUND');
    return { roleId: role.id, roles, pages: db.pages, permissions: db.permissions.filter((p) => p.roleId === role.id).sort((a, b) => a.pageId - b.pageId).map((p) => this.permissionDto(db, p)) };
  }

  /** Add and Delete only where the page has them; any other right turns View on. */
  private apply(db: DemoDb, row: DemoPermission, body: Record<string, unknown>): void {
    const page = db.pages.find((p) => p.id === row.pageId);
    if (!page)
      throw new DemoFailure(400, 'PERMISSION_PAGE_UNKNOWN');
    row.canAdd = !!body['canAdd'] && page.hasAdd;
    row.canEdit = !!body['canEdit'];
    row.canDelete = !!body['canDelete'] && page.hasDelete;
    row.canView = !!body['canView'] || row.canAdd || row.canEdit || row.canDelete;
  }

  private rightRole(db: DemoDb, caller: DemoUser, roleId: number): DemoRole {
    const role = this.role(db, roleId);
    if (!role)
      throw new DemoFailure(404, 'ROLE_NOT_FOUND');
    if (role.code === 'super-admin' && !this.isSuper(db, caller))
      throw new DemoFailure(403, 'ROLE_SUPER_ADMIN_ONLY');
    return role;
  }

  private addRight(db: DemoDb, caller: DemoUser, body: Record<string, unknown>): { code: string; data: RolePermission } {
    const role = this.rightRole(db, caller, Number(body['roleId']));
    const row: DemoPermission = { id: 0, roleId: role.id, pageId: Number(body['pageId']), canView: false, canAdd: false, canEdit: false, canDelete: false };
    this.apply(db, row, body);
    if (db.permissions.some((p) => p.roleId === row.roleId && p.pageId === row.pageId))
      throw new DemoFailure(409, 'PERMISSION_EXISTS');
    row.id = this.next(db);
    db.permissions.push(row);
    return { code: 'PERMISSION_SAVED', data: this.permissionDto(db, row) };
  }

  private updateRight(db: DemoDb, caller: DemoUser, id: number, body: Record<string, unknown>): { code: string; data: RolePermission } {
    const row = db.permissions.find((p) => p.id === id);
    if (!row)
      throw new DemoFailure(404, 'PERMISSION_NOT_FOUND');
    this.rightRole(db, caller, row.roleId);
    this.apply(db, row, body);
    return { code: 'PERMISSION_SAVED', data: this.permissionDto(db, row) };
  }

  private deleteRight(db: DemoDb, caller: DemoUser, id: number): { code: string } {
    const row = db.permissions.find((p) => p.id === id);
    if (!row)
      throw new DemoFailure(404, 'PERMISSION_NOT_FOUND');
    this.rightRole(db, caller, row.roleId);
    db.permissions = db.permissions.filter((p) => p.id !== id);
    return { code: 'PERMISSION_DELETED' };
  }

  /** Settings > Mail is for a super admin only, as in the API (which also needs a password login). */
  private superCaller(db: DemoDb, token: string | null): DemoUser {
    const user = this.caller(db, token);
    if (!this.isSuper(db, user))
      throw new DemoFailure(403, 'AUTH_FORBIDDEN');
    return user;
  }

  /** The saved mail server of a purpose, or the starting values (DEMO_MAIL) when it was never saved. */
  private mailOf(db: DemoDb, purpose: MailPurpose): MailSetting {
    return db.mail?.find((m) => m.purpose === purpose) ?? { ...DEMO_MAIL, purpose };
  }

  /**
   * The rules of MailSettingService: switching a server on needs a host and a From address, the port is 1 to 65535. A blank password keeps the saved one,
   * and no user name means no login. The demo never keeps the password itself (this browser's storage is not a safe place): only whether one was given.
   */
  private saveMail(db: DemoDb, purpose: MailPurpose, body: Record<string, unknown>): { code: string; data: MailSetting } {
    const text = (name: string) => String(body[name] ?? '').trim();
    const fromAddress = text('fromAddress') ? this.email(body['fromAddress']) : '';
    const security = text('security').toLowerCase() as MailSecurity;
    const port = Number(body['port']);
    const enabled = !!body['enabled'];
    if (!MAIL_PURPOSES.includes(purpose))
      throw new DemoFailure(404, 'MAIL_INVALID');
    if (fromAddress === null || !MAIL_SECURITIES.includes(security) || !Number.isInteger(port) || port < 1 || port > 65535 || text('host').length > 255 || text('userName').length > 256 || text('fromName').length > 100 || String(body['password'] ?? '').length > 256)
      throw new DemoFailure(400, 'MAIL_INVALID');
    if (enabled && (!text('host') || !fromAddress))
      throw new DemoFailure(400, 'MAIL_INVALID');
    const saved = this.mailOf(db, purpose);
    const userName = text('userName');
    const hasPassword = !!userName && (String(body['password'] ?? '').length > 0 || saved.hasPassword);
    const setting: MailSetting = { host: text('host'), port, enabled, fromName: text('fromName'), userName, fromAddress, hasPassword, purpose, security };
    db.mail = [...(db.mail ?? []).filter((m) => m.purpose !== purpose), setting];
    return { code: 'MAIL_SAVED', data: setting };
  }

  /** The API mails the super admin through the saved server; the demo has no mail server, so it only checks the server is on and complete. */
  private testMail(db: DemoDb, user: DemoUser, purpose: MailPurpose): { code: string; args: string[] } {
    if (!MAIL_PURPOSES.includes(purpose))
      throw new DemoFailure(404, 'MAIL_INVALID');
    const setting = this.mailOf(db, purpose);
    if (!setting.enabled || !setting.host)
      throw new DemoFailure(400, 'MAIL_TEST_OFF');
    return { code: 'MAIL_TEST_DEMO', args: [user.email] };
  }

  // #endregion
}
