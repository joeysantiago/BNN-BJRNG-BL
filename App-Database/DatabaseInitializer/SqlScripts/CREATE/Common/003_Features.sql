IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Features')
BEGIN
    CREATE TABLE Features
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                            ,
        Code          NVARCHAR(50)      NOT NULL                                                            ,
        IsEnabled     BIT               NOT NULL CONSTRAINT DF_Features_IsEnabled DEFAULT (1)               ,
        SortOrder     INT               NOT NULL CONSTRAINT DF_Features_SortOrder DEFAULT (0)               ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_Features_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_Features_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_Features_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                                ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_Features_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                                ,
        ModifiedOn    DATETIME2         NULL                                                                ,

        CONSTRAINT PK_Features PRIMARY KEY CLUSTERED (Id),
        
    );

    CREATE UNIQUE INDEX IX_Features_Code ON Features (Code);
END
GO
