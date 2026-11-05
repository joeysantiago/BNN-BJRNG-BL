IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Countries')
BEGIN
    CREATE TABLE Countries
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                             ,
        Code          NVARCHAR(2)       NOT NULL                                                             ,
        Name          NVARCHAR(100)     NOT NULL                                                             ,
        SortOrder     INT               NOT NULL                                                             ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_Countries_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_Countries_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_Countries_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                                 ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_Countries_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                                 ,
        ModifiedOn    DATETIME2         NULL                                                                 ,

        CONSTRAINT PK_Countries PRIMARY KEY CLUSTERED (Id)
    );

    CREATE UNIQUE INDEX IX_Countries_Code ON Countries (Code);
END
GO
