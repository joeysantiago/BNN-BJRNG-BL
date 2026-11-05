IF NOT EXISTS (SELECT 1 FROM Countries)
BEGIN
    INSERT INTO Countries (Code, Name, SortOrder)
    VALUES
        ('IN', N'India', 1);
END
GO
