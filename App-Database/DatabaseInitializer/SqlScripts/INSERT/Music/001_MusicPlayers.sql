IF NOT EXISTS (SELECT 1 FROM MusicPlayers)
BEGIN
    INSERT INTO MusicPlayers (Code, Name, FolderName)
    VALUES
        ('nexon', 'Nexon', 'nexon');
END
GO
