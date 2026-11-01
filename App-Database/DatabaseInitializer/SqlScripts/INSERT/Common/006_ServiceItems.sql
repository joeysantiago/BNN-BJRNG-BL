IF NOT EXISTS (SELECT 1 FROM ServiceItems)
BEGIN
    INSERT INTO ServiceItems (Code, Name, GroupCode, Url, ProbeUrl, StatusPageUrl, IsEnabled, SortOrder)
    VALUES
        ('teams', N'Microsoft Teams', 'apps', 'https://teams.microsoft.com', NULL, NULL, 1, 1),
        ('github', N'GitHub', 'apps', 'https://github.com', NULL, 'https://www.githubstatus.com', 1, 2),
        ('cloudflare', N'Cloudflare', 'apps', 'https://www.cloudflare.com', NULL, 'https://www.cloudflarestatus.com', 1, 3),
        ('discord', N'Discord', 'apps', 'https://discord.com', NULL, 'https://discordstatus.com', 1, 4),
        ('facebook', N'Facebook', 'apps', 'https://www.facebook.com', NULL, NULL, 1, 5),
        ('whatsapp', N'WhatsApp', 'apps', 'https://web.whatsapp.com', NULL, NULL, 1, 6),
        ('x', N'X', 'apps', 'https://x.com', 'https://x.com/favicon.ico', NULL, 1, 7),
        ('reddit', N'Reddit', 'apps', 'https://www.reddit.com', NULL, 'https://www.redditstatus.com', 1, 8),
        ('zoom', N'Zoom', 'apps', 'https://zoom.us', NULL, 'https://www.zoomstatus.com', 1, 9),
        ('npm', N'npm', 'apps', 'https://www.npmjs.com', NULL, 'https://status.npmjs.org', 1, 10),
        ('instagram', N'Instagram', 'apps', 'https://www.instagram.com', NULL, NULL, 1, 11),
        ('youtube', N'YouTube', 'apps', 'https://www.youtube.com', NULL, NULL, 1, 12),
        ('google', N'Google', 'apps', 'https://www.google.com', NULL, NULL, 1, 13),
        ('slack', N'Slack', 'apps', 'https://slack.com', NULL, NULL, 1, 14),
        ('telegram', N'Telegram', 'apps', 'https://web.telegram.org', NULL, NULL, 1, 15),
        ('dropbox', N'Dropbox', 'apps', 'https://www.dropbox.com', NULL, 'https://status.dropbox.com', 1, 16),
        ('jio', N'Jio', 'telecom', 'https://www.jio.com', NULL, NULL, 1, 17),
        ('airtel', N'Airtel', 'telecom', 'https://www.airtel.in', NULL, NULL, 1, 18),
        ('vi', N'Vi', 'telecom', 'https://www.myvi.in', 'https://www.vodafoneidea.com', NULL, 1, 19),
        ('bsnl', N'BSNL', 'telecom', 'https://www.bsnl.co.in', NULL, NULL, 1, 20);
END
GO
