IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KhataPushSubscriptions')
BEGIN
    CREATE TABLE KhataPushSubscriptions
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                                          ,
        UserId        INT               NOT NULL                                                                          ,
        Endpoint      NVARCHAR(800)     NOT NULL                                                                          ,
        EndpointHash  CHAR(64)          NOT NULL                                                                          ,
        P256dh        VARCHAR(200)      NOT NULL                                                                          ,
        Auth          VARCHAR(100)      NOT NULL                                                                          ,
        UserAgent     NVARCHAR(300)     NULL                                                                              ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_KhataPushSubscriptions_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_KhataPushSubscriptions_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_KhataPushSubscriptions_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                                              ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_KhataPushSubscriptions_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                                              ,
        ModifiedOn    DATETIME2         NULL                                                                              ,

        CONSTRAINT PK_KhataPushSubscriptions PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_KhataPushSubscriptions_KhataUsers_UserId FOREIGN KEY (UserId) REFERENCES KhataUsers (Id)
    );

    CREATE UNIQUE INDEX IX_KhataPushSubscriptions_EndpointHash ON KhataPushSubscriptions (EndpointHash);
    CREATE INDEX IX_KhataPushSubscriptions_UserId ON KhataPushSubscriptions (UserId);
END
GO
