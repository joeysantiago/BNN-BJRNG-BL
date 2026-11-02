-- Super Admin and Admin: every right on every page (a super admin has them anyway; the rows only show it on the Role rights tab).
-- Standard User: only their own account tab (language, theme, password and the options of their own pages).
IF NOT EXISTS (SELECT 1 FROM RolePermissions)
BEGIN
    INSERT INTO RolePermissions (RoleId, PageId, CanView, CanAdd, CanEdit, CanDelete)
    SELECT r.Id, p.Id, 1, p.HasAdd, 1, p.HasDelete
    FROM Roles r
    CROSS JOIN Pages p
    WHERE r.Code IN ('super-admin', 'admin');

    INSERT INTO RolePermissions (RoleId, PageId, CanView, CanAdd, CanEdit, CanDelete)
    SELECT r.Id, p.Id, 1, 0, 1, 0
    FROM Roles r
    JOIN Pages p ON p.Code = 'settings.account'
    WHERE r.Code = 'standard';
END
GO
