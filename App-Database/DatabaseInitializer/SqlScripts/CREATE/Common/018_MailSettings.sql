IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'MailSettings')
BEGIN
    CREATE TABLE MailSettings
    (
        Id                INT IDENTITY(1,1) NOT NULL                                                                ,
        Purpose           NVARCHAR(20)      NOT NULL                                                                ,
        Enabled           BIT               NOT NULL                                                                ,
        Host              NVARCHAR(255)     NULL                                                                    ,
        Port              INT               NOT NULL                                                                ,
        Security          NVARCHAR(10)      NOT NULL                                                                ,
        UserName          NVARCHAR(256)     NULL                                                                    ,
        PasswordProtected NVARCHAR(MAX)     NULL                                                                    ,
        FromAddress       NVARCHAR(256)     NULL                                                                    ,
        FromName          NVARCHAR(100)     NULL                                                                    ,
        IsActive          BIT               NOT NULL CONSTRAINT DF_MailSettings_IsActive DEFAULT (1)                ,
        IsSoftDeleted     BIT               NOT NULL CONSTRAINT DF_MailSettings_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted         BIT               NOT NULL CONSTRAINT DF_MailSettings_IsDeleted DEFAULT (0)               ,
        CreatedBy         INT               NULL                                                                    ,
        CreatedOn         DATETIME2         NOT NULL CONSTRAINT DF_MailSettings_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy        INT               NULL                                                                    ,
        ModifiedOn        DATETIME2         NULL                                                                    ,

        CONSTRAINT PK_MailSettings PRIMARY KEY CLUSTERED (Id)
    );

    CREATE UNIQUE INDEX IX_MailSettings_Purpose ON MailSettings (Purpose) WHERE IsDeleted = 0 AND IsSoftDeleted = 0;
END
GO
