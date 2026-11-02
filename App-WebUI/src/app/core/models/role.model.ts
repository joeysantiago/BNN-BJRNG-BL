/** The pages (Settings tabs) role rights are given for. Same codes as the Pages table of the API (Thakurg.Contracts/Auth/PageCodes.cs). */
export type PageCode = 'settings.account' | 'settings.users' | 'settings.roles' | 'settings.permissions' | 'settings.features' | 'settings.connection' | 'settings.services' | 'settings.youtube' | 'settings.json';

/** The four rights a role can have on a page. */
export type PermissionAction = 'view' | 'add' | 'edit' | 'delete';

/** A role (RoleDto). `isSystem` roles keep their code and cannot be deleted; the `isDefault` role is given to every self sign-up. */
export interface RoleInfo {
  id: number;
  code: string;
  name: string;
  isSystem: boolean;
  sortOrder: number;
  userCount: number;
  isDefault: boolean;
  description: string | null;
}

/** A page rights are given for (PageDto). `hasAdd` / `hasDelete`: whether Add and Delete mean anything on it. */
export interface PageInfo {
  id: number;
  code: PageCode;
  hasAdd: boolean;
  hasDelete: boolean;
}

/** One page given to a role, with its rights (RolePermissionDto). */
export interface RolePermission {
  id: number;
  pageId: number;
  roleId: number;
  canAdd: boolean;
  canEdit: boolean;
  canView: boolean;
  canDelete: boolean;
  pageCode: PageCode;
}

/** GET /admin/role-permissions?roleId= (0 = the first role): every role, every page, and the rights of the role on the pages it was given. */
export interface RolePermissionList {
  roleId: number;
  pages: PageInfo[];
  roles: RoleInfo[];
  permissions: RolePermission[];
}

/** The four rights of a row, as sent to the API. */
export interface RightFlags {
  canAdd: boolean;
  canEdit: boolean;
  canView: boolean;
  canDelete: boolean;
}

/** The body of a role add or change (RoleSaveDto). */
export interface RoleForm {
  code: string;
  name: string;
  sortOrder: number;
  isDefault: boolean;
  description: string;
}
