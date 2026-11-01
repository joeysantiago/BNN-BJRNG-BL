IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KhataAuditLog')
BEGIN
    CREATE TABLE KhataAuditLog
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                                 ,
        UserId        INT               NULL                                                                     ,
        BookId        INT               NULL                                                                     ,
        ContactId     INT               NULL                                                                     ,
        Action        VARCHAR(50)       NOT NULL                                                                 ,
        Details       NVARCHAR(MAX)     NULL                                                                     ,
        RequestIp     VARCHAR(45)       NULL                                                                     ,
        UserAgent     NVARCHAR(300)     NULL                                                                     ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_KhataAuditLog_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_KhataAuditLog_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_KhataAuditLog_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                                     ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_KhataAuditLog_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                                     ,
        ModifiedOn    DATETIME2         NULL                                                                     ,

        CONSTRAINT PK_KhataAuditLog PRIMARY KEY CLUSTERED (Id)
    );

    CREATE INDEX IX_KhataAuditLog_UserId_CreatedOn ON KhataAuditLog (UserId, CreatedOn);
    CREATE INDEX IX_KhataAuditLog_Action_CreatedOn ON KhataAuditLog (Action, CreatedOn);
END
GO
