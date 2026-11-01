IF NOT EXISTS (SELECT 1 FROM ConnectionFields)
BEGIN
    INSERT INTO ConnectionFields (Code, IsEnabled, SortOrder)
    VALUES
        ('isp', 1, 1),
        ('ip', 1, 2),
        ('ipv4', 1, 3),
        ('ipv6', 0, 4),
        ('mac', 0, 5),
        ('location', 1, 6),
        ('testServer', 1, 7),
        ('networkType', 0, 8);
END
GO
