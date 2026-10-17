IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Translations')
BEGIN
    CREATE TABLE Translations
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                                ,
        PageCode      NVARCHAR(50)      NOT NULL                                                                ,
        Eng           NVARCHAR(MAX)     NOT NULL                                                                ,
        Hin           NVARCHAR(MAX)     NOT NULL                                                                ,
        Arab          NVARCHAR(MAX)     NOT NULL                                                                ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_Translations_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_Translations_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_Translations_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                                    ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_Translations_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                                    ,
        ModifiedOn    DATETIME2         NULL                                                                    ,

        CONSTRAINT PK_Translations PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT CK_Translations_Eng CHECK (ISJSON(Eng) = 1),
        CONSTRAINT CK_Translations_Hin CHECK (ISJSON(Hin) = 1),
        CONSTRAINT CK_Translations_Arab CHECK (ISJSON(Arab) = 1)
    );

    CREATE UNIQUE INDEX IX_Translations_PageCode ON Translations (PageCode);
END
GO
