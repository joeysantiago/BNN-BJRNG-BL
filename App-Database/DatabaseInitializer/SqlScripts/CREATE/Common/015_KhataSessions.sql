IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KhataSessions')
BEGIN
    CREATE TABLE KhataSessions
    (
        Id               INT IDENTITY(1,1) NOT NULL                                                                  ,
        UserId           INT               NOT NULL                                                                  ,
        RefreshTokenHash CHAR(64)          NOT NULL                                                                  ,
        DeviceId         VARCHAR(64)       NOT NULL                                                                  ,
        UserAgent        NVARCHAR(300)     NULL                                                                      ,
        LoggedInOn       DATETIME2         NOT NULL CONSTRAINT DF_KhataSessions_LoggedInOn DEFAULT (SYSUTCDATETIME()),
        ExpiresOn        DATETIME2         NOT NULL                                                                  ,
        RevokedOn        DATETIME2         NULL                                                                      ,
        IsActive         BIT               NOT NULL CONSTRAINT DF_KhataSessions_IsActive DEFAULT (1)                 ,
        IsSoftDeleted    BIT               NOT NULL CONSTRAINT DF_KhataSessions_IsSoftDeleted DEFAULT (0)            ,
        IsDeleted        BIT               NOT NULL CONSTRAINT DF_KhataSessions_IsDeleted DEFAULT (0)                ,
        CreatedBy        INT               NULL                                                                      ,
        CreatedOn        DATETIME2         NOT NULL CONSTRAINT DF_KhataSessions_CreatedOn DEFAULT (SYSUTCDATETIME()) ,
        ModifiedBy       INT               NULL                                                                      ,
        ModifiedOn       DATETIME2         NULL                                                                      ,

        CONSTRAINT PK_KhataSessions PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_KhataSessions_KhataUsers_UserId FOREIGN KEY (UserId) REFERENCES KhataUsers (Id)
    );

    CREATE UNIQUE INDEX IX_KhataSessions_RefreshTokenHash ON KhataSessions (RefreshTokenHash);
    CREATE INDEX IX_KhataSessions_UserId ON KhataSessions (UserId);
END
GO
