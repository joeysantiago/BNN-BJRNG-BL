IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ConnectionFields')
BEGIN
    CREATE TABLE ConnectionFields
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                                    ,
        Code          NVARCHAR(50)      NOT NULL                                                                    ,
        IsEnabled     BIT               NOT NULL CONSTRAINT DF_ConnectionFields_IsEnabled DEFAULT (1)               ,
        SortOrder     INT               NOT NULL CONSTRAINT DF_ConnectionFields_SortOrder DEFAULT (0)               ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_ConnectionFields_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_ConnectionFields_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_ConnectionFields_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                                        ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_ConnectionFields_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                                        ,
        ModifiedOn    DATETIME2         NULL                                                                        ,

        CONSTRAINT PK_ConnectionFields PRIMARY KEY CLUSTERED (Id),
        
    );

    CREATE UNIQUE INDEX IX_ConnectionFields_Code ON ConnectionFields (Code);
END
GO
