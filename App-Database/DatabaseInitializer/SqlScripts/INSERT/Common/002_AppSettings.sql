IF NOT EXISTS (SELECT 1 FROM AppSettings)
BEGIN
    INSERT INTO AppSettings (Code, Value, Description)
    VALUES
        ('Auth.SignupVerification', N'email', N'Where the code that checks a new sign-up goes: email, whatsapp or sms (Settings > General, super admin).'),
        ('Connection.Enabled', N'true', N'Show the "Your connection details" section.'),
        ('Services.Enabled', N'true', N'Show the "Services status" section.'),
        ('Services.RefreshSeconds', N'120', N'Seconds between automatic status re-checks. 0 turns it off.'),
        ('Speed.GaugeStops', N'0,5,10,25,50,75,100,250,500,1000,2500,5000,10000', N'Speeds in Mbps printed on the speed test gauge, evenly spaced. The first is 0, each is larger than the one before.'),
        ('SpeedTest.ServerName', N'Thakurg', N'Name shown as the test server on the speed test page.'),
        ('Storage.Provider', N'azure', N'Where every app keeps its files: azure (the Blob container of FileStorage, under the environment folder) or local (the App-Data folder). Settings > Keys, super admin.'),
        ('Tasks.MaxPhotosPerTask', N'8', N'My Tasks: the most pictures one task can have.'),
        ('Tasks.MaxPhotoBytes', N'3145728', N'My Tasks: the largest picture the server accepts, in bytes (after the app has shrunk it).'),
        ('Tasks.MaxPickedBytes', N'15728640', N'My Tasks: the largest picture the app accepts from the gallery or camera before shrinking it, in bytes.'),
        ('Tasks.PhotoEdgePx', N'1600', N'My Tasks: the longest edge, in pixels, the app shrinks a picture to.'),
        ('Tasks.MaxChecklistItems', N'100', N'My Tasks: the most checklist lines one task can have.'),
        ('Tasks.MaxCategories', N'30', N'My Tasks: the most categories one user can have.'),
        ('Tasks.MaxBulkTasks', N'200', N'My Tasks: the most tasks one bulk action can change.');
END
GO
