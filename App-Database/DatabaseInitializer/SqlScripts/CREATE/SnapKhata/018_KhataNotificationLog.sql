IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KhataNotificationLog')
BEGIN
    CREATE TABLE KhataNotificationLog
    (
        Id                INT IDENTITY(1,1) NOT NULL                                                                        ,
        UserId            INT               NULL                                                                            ,
        ContactId         INT               NULL                                                                            ,
        Channel           TINYINT           NOT NULL                                                                        ,
        Template          VARCHAR(50)       NOT NULL                                                                        ,
        Status            TINYINT           NOT NULL                                                                        ,
        ProviderMessageId VARCHAR(200)      NULL                                                                            ,
        Error             NVARCHAR(500)     NULL                                                                            ,
        IsActive          BIT               NOT NULL CONSTRAINT DF_KhataNotificationLog_IsActive DEFAULT (1)                ,
        IsSoftDeleted     BIT               NOT NULL CONSTRAINT DF_KhataNotificationLog_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted         BIT               NOT NULL CONSTRAINT DF_KhataNotificationLog_IsDeleted DEFAULT (0)               ,
        CreatedBy         INT               NULL                                                                            ,
        CreatedOn         DATETIME2         NOT NULL CONSTRAINT DF_KhataNotificationLog_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy        INT               NULL                                                                            ,
        ModifiedOn        DATETIME2         NULL                                                                            ,

        CONSTRAINT PK_KhataNotificationLog PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_KhataNotificationLog_KhataUsers_UserId FOREIGN KEY (UserId) REFERENCES KhataUsers (Id),
        CONSTRAINT FK_KhataNotificationLog_KhataContacts_ContactId FOREIGN KEY (ContactId) REFERENCES KhataContacts (Id)
    );

    CREATE INDEX IX_KhataNotificationLog_UserId_CreatedOn ON KhataNotificationLog (UserId, CreatedOn);
    CREATE INDEX IX_KhataNotificationLog_ContactId_CreatedOn ON KhataNotificationLog (ContactId, CreatedOn);
END
GO
