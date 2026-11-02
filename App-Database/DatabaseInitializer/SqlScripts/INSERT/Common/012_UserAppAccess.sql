-- The development logins (009_Users.sql): the super admin and the admin get every app; the standard user only the apps a sign-up gets (AutoGrant) plus Creta.
INSERT INTO UserAppAccess (UserId, AppId)
SELECT u.Id, a.Id
FROM Users u
CROSS JOIN Apps a
WHERE (u.Email IN ('superadmin@thakurg.com', 'admin@thakurg.com') OR (u.Email = 'user@thakurg.com' AND (a.AutoGrant = 1 OR a.Code = 'creta')))
  AND NOT EXISTS (SELECT 1 FROM UserAppAccess x WHERE x.UserId = u.Id AND x.AppId = a.Id);
GO
