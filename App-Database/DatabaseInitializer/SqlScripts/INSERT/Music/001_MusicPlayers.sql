IF NOT EXISTS (SELECT 1 FROM MusicPlayers)
BEGIN
    INSERT INTO MusicPlayers (Code, Name, FolderName)
    VALUES
        ('creta', 'Creta', 'creta');
END
GO
