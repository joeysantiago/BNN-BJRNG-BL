IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Apps')
BEGIN
    CREATE TABLE Apps
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                        ,
        Code          VARCHAR(30)       NOT NULL                                                        ,
        AutoGrant     BIT               NOT NULL CONSTRAINT DF_Apps_AutoGrant DEFAULT (0)               ,
        SortOrder     INT               NOT NULL CONSTRAINT DF_Apps_SortOrder DEFAULT (0)               ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_Apps_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_Apps_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_Apps_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                            ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_Apps_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                            ,
        ModifiedOn    DATETIME2         NULL                                                            ,

        CONSTRAINT PK_Apps PRIMARY KEY CLUSTERED (Id)
    );

    CREATE UNIQUE INDEX IX_Apps_Code ON Apps (Code);
END
GO
