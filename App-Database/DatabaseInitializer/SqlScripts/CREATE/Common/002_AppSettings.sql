IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'AppSettings')
BEGIN
    CREATE TABLE AppSettings
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                               ,
        Code          NVARCHAR(100)     NOT NULL                                                               ,
        Value         NVARCHAR(500)     NOT NULL                                                               ,
        Description   NVARCHAR(200)     NULL                                                                   ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_AppSettings_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_AppSettings_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_AppSettings_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                                   ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_AppSettings_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                                   ,
        ModifiedOn    DATETIME2         NULL                                                                   ,

        CONSTRAINT PK_AppSettings PRIMARY KEY CLUSTERED (Id),
        
    );

    CREATE UNIQUE INDEX IX_AppSettings_Code ON AppSettings (Code);
END
GO
