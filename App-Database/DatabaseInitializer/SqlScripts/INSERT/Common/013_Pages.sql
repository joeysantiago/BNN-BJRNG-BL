-- The pages (Settings tabs) that role rights are given for. HasAdd / HasDelete: whether Add and Delete mean anything on that page (View and Edit always do).
-- Each code is a constant in Thakurg.Contracts/Auth/PageCodes.cs; its name is the translation key perm.page.<code> (007_Translations.sql).
IF NOT EXISTS (SELECT 1 FROM Pages)
BEGIN
    INSERT INTO Pages (Code, HasAdd, HasDelete, SortOrder)
    VALUES
        ('settings.account', 0, 0, 1),
        ('settings.users', 1, 1, 2),
        ('settings.roles', 1, 1, 3),
        ('settings.permissions', 1, 1, 4),
        ('settings.features', 0, 0, 5),
        ('settings.connection', 0, 0, 6),
        ('settings.services', 0, 0, 7),
        ('settings.youtube', 0, 0, 8),
        ('settings.json', 0, 0, 9);
END
GO
