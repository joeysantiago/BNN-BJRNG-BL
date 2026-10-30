IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KhataPinAttempts')
BEGIN
    CREATE TABLE KhataPinAttempts
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                                    ,
        UserId        INT               NOT NULL                                                                    ,
        SessionId     INT               NULL                                                                        ,
        Purpose       TINYINT           NOT NULL                                                                    ,
        Success       BIT               NOT NULL                                                                    ,
        RequestIp     VARCHAR(45)       NULL                                                                        ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_KhataPinAttempts_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_KhataPinAttempts_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_KhataPinAttempts_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                                        ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_KhataPinAttempts_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                                        ,
        ModifiedOn    DATETIME2         NULL                                                                        ,

        CONSTRAINT PK_KhataPinAttempts PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_KhataPinAttempts_KhataUsers_UserId FOREIGN KEY (UserId) REFERENCES KhataUsers (Id),
        CONSTRAINT FK_KhataPinAttempts_KhataSessions_SessionId FOREIGN KEY (SessionId) REFERENCES KhataSessions (Id)
    );

    CREATE INDEX IX_KhataPinAttempts_UserId_CreatedOn ON KhataPinAttempts (UserId, CreatedOn);
END
GO
