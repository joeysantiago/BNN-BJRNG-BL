-- The three built-in roles (IsSystem: their code cannot change and they cannot be deleted). IsDefault marks the role a self sign-up gets.
-- super-admin has every right whatever its RolePermissions rows say; an admin cannot change super admins, their role or its rights.
IF NOT EXISTS (SELECT 1 FROM Roles)
BEGIN
    INSERT INTO Roles (Code, Name, Description, IsSystem, IsDefault, SortOrder)
    VALUES
        ('super-admin', N'Super Admin', N'Full rights on every page and every app.', 1, 0, 1),
        ('admin', N'Admin', N'Manages users, roles and settings, but cannot change super admins.', 1, 0, 2),
        ('standard', N'Standard User', N'Every self sign-up. Own language, theme, password and page options only.', 1, 1, 3);
END
GO
