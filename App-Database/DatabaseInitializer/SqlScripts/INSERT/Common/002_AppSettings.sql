IF NOT EXISTS (SELECT 1 FROM AppSettings)
BEGIN
    INSERT INTO AppSettings (Code, Value, Description)
    VALUES
        ('Connection.Enabled', N'true', N'Show the "Your connection details" section.'),
        ('Services.Enabled', N'true', N'Show the "Services status" section.'),
        ('Services.RefreshSeconds', N'120', N'Seconds between automatic status re-checks. 0 turns it off.'),
        ('Speed.GaugeStops', N'0,5,10,25,50,75,100,250,500,1000,2500,5000,10000', N'Speeds in Mbps printed on the speed test gauge, evenly spaced. The first is 0, each is larger than the one before.'),
        ('SpeedTest.ServerName', N'Thakurg', N'Name shown as the test server on the speed test page.');
END
GO
