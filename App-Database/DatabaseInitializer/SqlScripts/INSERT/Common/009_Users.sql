-- Development logins (remove before production), one per built-in role (008_Roles.sql):
--   superadmin@thakurg.com / Super@1234  (Super Admin)
--   admin@thakurg.com      / Admin@1234  (Admin)
--   user@thakurg.com       / User@1234   (Standard User)
IF NOT EXISTS (SELECT 1 FROM Users)
BEGIN
    INSERT INTO Users (Email, PasswordHash, DisplayName, Language, RoleId)
    SELECT v.Email, v.PasswordHash, v.DisplayName, 'en', r.Id
    FROM
    (
        VALUES
            ('superadmin@thakurg.com', 'v2.100000.c3vYQX/nYmaBVQAaHWDJEA==.Ou8HWqlyzK2pyQgW3C3J3gWZ1YMUt2jccvRSgCW8vdQ=', N'Super Admin', 'super-admin'),
            ('admin@thakurg.com', 'v2.100000.unebASV1GYonhI0l163zyQ==.OQWM9wBdnWyKAuHuEHZ9EElCmxn6X4r+U+Dlw2/KFSs=', N'Admin', 'admin'),
            ('user@thakurg.com', 'v2.100000.XrtqFrBavlHv/UThmeXJVQ==.y2KqKez2vfZEsziOQ8h5wSWsJBHra6Jytb1ywdpy8Ow=', N'Standard User', 'standard')
    ) AS v (Email, PasswordHash, DisplayName, RoleCode)
    JOIN Roles r ON r.Code = v.RoleCode;
END
GO
