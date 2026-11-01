IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KhataIdempotencyKeys')
BEGIN
    CREATE TABLE KhataIdempotencyKeys
    (
        Id             INT IDENTITY(1,1) NOT NULL                                                                        ,
        UserId         INT               NOT NULL                                                                        ,
        IdempotencyKey UNIQUEIDENTIFIER  NOT NULL                                                                        ,
        Endpoint       VARCHAR(200)      NOT NULL                                                                        ,
        RequestHash    CHAR(64)          NOT NULL                                                                        ,
        ResponseStatus INT               NOT NULL                                                                        ,
        ResponseBody   NVARCHAR(MAX)     NULL                                                                            ,
        ExpiresOn      DATETIME2         NOT NULL                                                                        ,
        IsActive       BIT               NOT NULL CONSTRAINT DF_KhataIdempotencyKeys_IsActive DEFAULT (1)                ,
        IsSoftDeleted  BIT               NOT NULL CONSTRAINT DF_KhataIdempotencyKeys_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted      BIT               NOT NULL CONSTRAINT DF_KhataIdempotencyKeys_IsDeleted DEFAULT (0)               ,
        CreatedBy      INT               NULL                                                                            ,
        CreatedOn      DATETIME2         NOT NULL CONSTRAINT DF_KhataIdempotencyKeys_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy     INT               NULL                                                                            ,
        ModifiedOn     DATETIME2         NULL                                                                            ,

        CONSTRAINT PK_KhataIdempotencyKeys PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_KhataIdempotencyKeys_KhataUsers_UserId FOREIGN KEY (UserId) REFERENCES KhataUsers (Id)
    );

    CREATE UNIQUE INDEX IX_KhataIdempotencyKeys_UserId_IdempotencyKey ON KhataIdempotencyKeys (UserId, IdempotencyKey);
    CREATE INDEX IX_KhataIdempotencyKeys_ExpiresOn ON KhataIdempotencyKeys (ExpiresOn);
END
GO
