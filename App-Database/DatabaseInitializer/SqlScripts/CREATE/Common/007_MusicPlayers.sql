IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'MusicPlayers')
BEGIN
    CREATE TABLE MusicPlayers
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                                ,
        Code          NVARCHAR(30)      NOT NULL                                                                ,
        Name          NVARCHAR(100)     NOT NULL                                                                ,
        FolderName    NVARCHAR(100)     NOT NULL                                                                ,
        PasswordHash  NVARCHAR(200)     NOT NULL                                                                ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_MusicPlayers_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_MusicPlayers_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_MusicPlayers_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                                    ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_MusicPlayers_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                                    ,
        ModifiedOn    DATETIME2         NULL                                                                    ,

        CONSTRAINT PK_MusicPlayers PRIMARY KEY CLUSTERED (Id),
        
    );

    CREATE UNIQUE INDEX IX_MusicPlayers_Code ON MusicPlayers (Code);
END
GO
