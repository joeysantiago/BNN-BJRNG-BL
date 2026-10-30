IF NOT EXISTS (SELECT 1 FROM MusicPlayers)
BEGIN
    INSERT INTO MusicPlayers (Code, Name, FolderName, PasswordHash)
    VALUES
        ('creta', 'Creta', 'creta', 'ceb73fa88041c2f58999c6c512c4538f754ad096f84745b3ccba26f7b91c96c2'),
        ('nexon', 'Nexon', 'nexon', '3bb4657f611b9c7982912764ece3bb7fff16388390ffa87c9371e0ece7e79844');
END
GO
