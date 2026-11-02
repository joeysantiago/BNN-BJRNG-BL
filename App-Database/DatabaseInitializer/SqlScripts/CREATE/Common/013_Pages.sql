IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Pages')
BEGIN
    CREATE TABLE Pages
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                         ,
        Code          NVARCHAR(50)      NOT NULL                                                         ,
        HasAdd        BIT               NOT NULL CONSTRAINT DF_Pages_HasAdd DEFAULT (0)                  ,
        HasDelete     BIT               NOT NULL CONSTRAINT DF_Pages_HasDelete DEFAULT (0)               ,
        SortOrder     INT               NOT NULL CONSTRAINT DF_Pages_SortOrder DEFAULT (0)               ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_Pages_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_Pages_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_Pages_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                             ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_Pages_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                             ,
        ModifiedOn    DATETIME2         NULL                                                             ,

        CONSTRAINT PK_Pages PRIMARY KEY CLUSTERED (Id)
    );

    CREATE UNIQUE INDEX IX_Pages_Code ON Pages (Code);
END
GO
