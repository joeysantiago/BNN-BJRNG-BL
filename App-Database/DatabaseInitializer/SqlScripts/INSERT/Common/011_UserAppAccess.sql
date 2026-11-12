-- The development administrator (008_Users.sql) gets every app.
INSERT INTO UserAppAccess (UserId, AppId)
SELECT u.Id, a.Id
FROM Users u
CROSS JOIN Apps a
WHERE u.Email = 'admin@thakurg.com'
  AND NOT EXISTS (SELECT 1 FROM UserAppAccess x WHERE x.UserId = u.Id AND x.AppId = a.Id);
GO
