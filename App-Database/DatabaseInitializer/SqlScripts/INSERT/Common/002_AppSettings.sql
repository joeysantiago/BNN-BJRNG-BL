IF NOT EXISTS (SELECT 1 FROM AppSettings)
BEGIN
    INSERT INTO AppSettings (Code, Value, Description)
    VALUES
        ('Connection.Enabled', N'true', N'Show the "Your connection details" section.'),
        ('Services.Enabled', N'true', N'Show the "Services status" section.'),
        ('Services.RefreshSeconds', N'120', N'Seconds between automatic status re-checks. 0 turns it off.'),
        ('Security.MasterKeyHash', N'v2.100000.InTRcp3pFRu/7govGXK0Dw==.8m0vr5kSqd0Qc6iDD8cqgKsryASYAsnY+ESnWJ+M1qs=', N'Hash of the master key used to reset player passwords. Never store the key itself.'),
        ('SpeedTest.ServerName', N'Thakurg', N'Name shown as the test server on the speed test page.');
END
GO
