IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'MusicTracks')
BEGIN
    CREATE TABLE MusicTracks
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                               ,
        PlayerId      INT               NOT NULL                                                               ,
        Title         NVARCHAR(200)     NOT NULL                                                               ,
        Artist        NVARCHAR(200)     NULL                                                                   ,
        FileName      NVARCHAR(260)     NOT NULL                                                               ,
        CoverFileName NVARCHAR(260)     NULL                                                                   ,
        SortOrder     INT               NOT NULL CONSTRAINT DF_MusicTracks_SortOrder DEFAULT (0)               ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_MusicTracks_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_MusicTracks_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_MusicTracks_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                                   ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_MusicTracks_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                                   ,
        ModifiedOn    DATETIME2         NULL                                                                   ,

        CONSTRAINT PK_MusicTracks PRIMARY KEY CLUSTERED (Id),
        
    );

    ALTER TABLE MusicTracks ADD CONSTRAINT FK_MusicTracks_MusicPlayers FOREIGN KEY (PlayerId) REFERENCES MusicPlayers (Id);

    CREATE UNIQUE INDEX IX_MusicTracks_PlayerId_FileName ON MusicTracks (PlayerId, FileName);
END
GO
