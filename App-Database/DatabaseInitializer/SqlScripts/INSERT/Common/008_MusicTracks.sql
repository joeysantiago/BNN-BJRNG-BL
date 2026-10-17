IF NOT EXISTS (SELECT 1 FROM MusicTracks)
BEGIN
    INSERT INTO MusicTracks (PlayerId, Title, FileName, SortOrder)
    SELECT p.Id, v.Title, v.FileName, v.SortOrder
    FROM (VALUES
        ('creta', N'Aye Khuda Murder 2', N'Aye Khuda Murder 2 320 Kbps.mp3', 1),
        ('creta', N'Bhula Dena Aashiqui 2', N'Bhula Dena Aashiqui 2 320 Kbps.mp3', 2),
        ('creta', N'Kiya Kiya Remix Version 1 Welcome', N'Kiya Kiya Remix Version 1 Welcome 320 Kbps.mp3', 3),
        ('creta', N'Kiya Kiya Welcome', N'Kiya Kiya Welcome 320 Kbps.mp3', 4),
        ('creta', N'Lo Maan Liya Raaz Reboot', N'Lo Maan Liya Raaz Reboot 320 Kbps.mp3', 5),
        ('creta', N'Milne Hai Mujhse Aayi Aashiqui 2', N'Milne Hai Mujhse Aayi Aashiqui 2 320 Kbps.mp3', 6),
        ('creta', N'Piya Aaye Na Aashiqui 2', N'Piya Aaye Na Aashiqui 2 320 Kbps.mp3', 7),
        ('creta', N'Raaz Aankhein Teri Raaz Reboot', N'Raaz Aankhein Teri Raaz Reboot 320 Kbps.mp3', 8),
        ('creta', N'Sunn Raha Hai Male Aashiqui 2', N'Sunn Raha Hai Male Aashiqui 2 320 Kbps.mp3', 9),
        ('creta', N'Toh Phir Aao Awarapan', N'Toh Phir Aao Awarapan 320 Kbps.mp3', 10),
        ('creta', N'Tum Hi Ho Aashiqui 2', N'Tum Hi Ho Aashiqui 2 320 Kbps.mp3', 11),
        ('creta', N'Uncha Lamba Kad Welcome', N'Uncha Lamba Kad Welcome 320 Kbps.mp3', 12),
        ('creta', N'Wo Bhi Apne Na Hue Dard Ki Dastan', N'Wo Bhi Apne Na Hue Dard Ki Dastan 320 Kbps.mp3', 13),
        ('creta', N'Yaad Hai Na Raaz Reboot', N'Yaad Hai Na Raaz Reboot 320 Kbps.mp3', 14),
        ('nexon', N'Jack Sparrow Ring', N'Jack Sparrow Ring.mp3', 15)
    ) AS v (PlayerCode, Title, FileName, SortOrder)
    INNER JOIN MusicPlayers p ON p.Code = v.PlayerCode;
END
GO
