IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PageNames')
BEGIN
    CREATE TABLE PageNames
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                             ,
        PageCode      NVARCHAR(50)      NOT NULL                                                             ,
        LanguageCode  NVARCHAR(10)      NOT NULL                                                             ,
        Name          NVARCHAR(200)     NOT NULL                                                             ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_PageNames_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_PageNames_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_PageNames_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                                 ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_PageNames_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                                 ,
        ModifiedOn    DATETIME2         NULL                                                                 ,

        CONSTRAINT PK_PageNames PRIMARY KEY CLUSTERED (Id),
        
    );

    CREATE UNIQUE INDEX IX_PageNames_PageCode_LanguageCode ON PageNames (PageCode, LanguageCode);
END
GO
