IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KhataOtps')
BEGIN
    CREATE TABLE KhataOtps
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                             ,
        Identifier    NVARCHAR(256)     NOT NULL                                                             ,
        Channel       TINYINT           NOT NULL                                                             ,
        CodeHash      CHAR(64)          NOT NULL                                                             ,
        ExpiresOn     DATETIME2         NOT NULL                                                             ,
        Attempts      INT               NOT NULL CONSTRAINT DF_KhataOtps_Attempts DEFAULT (0)                ,
        ConsumedOn    DATETIME2         NULL                                                                 ,
        RequestIp     VARCHAR(45)       NULL                                                                 ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_KhataOtps_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_KhataOtps_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_KhataOtps_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                                 ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_KhataOtps_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                                 ,
        ModifiedOn    DATETIME2         NULL                                                                 ,

        CONSTRAINT PK_KhataOtps PRIMARY KEY CLUSTERED (Id)
    );

    CREATE INDEX IX_KhataOtps_Identifier_CreatedOn ON KhataOtps (Identifier, CreatedOn);
END
GO
