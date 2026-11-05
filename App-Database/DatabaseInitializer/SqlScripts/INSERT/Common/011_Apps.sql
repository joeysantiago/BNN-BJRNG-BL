IF NOT EXISTS (SELECT 1 FROM Apps)
BEGIN
    INSERT INTO Apps (Code, AutoGrant, SortOrder)
    VALUES
        ('khata', 1, 1),
        ('tracker', 1, 2),
        ('creta', 0, 3),
        ('nexon', 0, 4),
        ('youtube', 0, 5),
        ('hr', 0, 6),
        ('tasks', 0, 7);
END
GO
