IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'OneTimeCodes')
BEGIN
    CREATE TABLE OneTimeCodes
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                                ,
        Destination   NVARCHAR(256)     NOT NULL                                                                ,
        Channel       VARCHAR(10)       NOT NULL                                                                ,
        AppCode       VARCHAR(20)       NOT NULL                                                                ,
        CodeHash      CHAR(64)          NOT NULL                                                                ,
        ExpiresOn     DATETIME2         NOT NULL                                                                ,
        Attempts      INT               NOT NULL CONSTRAINT DF_OneTimeCodes_Attempts DEFAULT (0)                ,
        ConsumedOn    DATETIME2         NULL                                                                    ,
        RequestIp     VARCHAR(45)       NULL                                                                    ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_OneTimeCodes_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_OneTimeCodes_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_OneTimeCodes_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                                    ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_OneTimeCodes_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                                    ,
        ModifiedOn    DATETIME2         NULL                                                                    ,

        CONSTRAINT PK_OneTimeCodes PRIMARY KEY CLUSTERED (Id)
    );

    CREATE INDEX IX_OneTimeCodes_Destination_CreatedOn ON OneTimeCodes (Destination, CreatedOn);
END
GO
