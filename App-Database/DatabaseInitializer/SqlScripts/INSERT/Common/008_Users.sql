-- Development login (remove before production): admin@thakurg.com / Admin@1234, an administrator with every app.
IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'admin@thakurg.com')
BEGIN
    INSERT INTO Users (Email, PasswordHash, DisplayName, Language, IsAdmin)
    VALUES
        ('admin@thakurg.com', 'v2.100000.unebASV1GYonhI0l163zyQ==.OQWM9wBdnWyKAuHuEHZ9EElCmxn6X4r+U+Dlw2/KFSs=', N'Admin', 'en', 1);
END
GO
