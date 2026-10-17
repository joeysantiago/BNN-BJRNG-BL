IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ServiceItems')
BEGIN
    CREATE TABLE ServiceItems
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                                ,
        Code          NVARCHAR(50)      NOT NULL                                                                ,
        Name          NVARCHAR(100)     NOT NULL                                                                ,
        GroupCode     NVARCHAR(20)      NOT NULL                                                                ,
        Url           NVARCHAR(300)     NOT NULL                                                                ,
        ProbeUrl      NVARCHAR(300)     NULL                                                                    ,
        StatusPageUrl NVARCHAR(300)     NULL                                                                    ,
        IsEnabled     BIT               NOT NULL CONSTRAINT DF_ServiceItems_IsEnabled DEFAULT (1)               ,
        SortOrder     INT               NOT NULL CONSTRAINT DF_ServiceItems_SortOrder DEFAULT (0)               ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_ServiceItems_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_ServiceItems_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_ServiceItems_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                                    ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_ServiceItems_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                                    ,
        ModifiedOn    DATETIME2         NULL                                                                    ,

        CONSTRAINT PK_ServiceItems PRIMARY KEY CLUSTERED (Id),
        
    );

    CREATE UNIQUE INDEX IX_ServiceItems_Code ON ServiceItems (Code);
END
GO
