IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'UserSessions')
BEGIN
    CREATE TABLE UserSessions
    (
        Id               INT IDENTITY(1,1) NOT NULL                                                                 ,
        UserId           INT               NOT NULL                                                                 ,
        RefreshTokenHash CHAR(64)          NOT NULL                                                                 ,
        DeviceId         VARCHAR(64)       NOT NULL                                                                 ,
        UserAgent        NVARCHAR(300)     NULL                                                                     ,
        LoggedInOn       DATETIME2         NOT NULL CONSTRAINT DF_UserSessions_LoggedInOn DEFAULT (SYSUTCDATETIME()),
        ExpiresOn        DATETIME2         NOT NULL                                                                 ,
        RevokedOn        DATETIME2         NULL                                                                     ,
        IsActive         BIT               NOT NULL CONSTRAINT DF_UserSessions_IsActive DEFAULT (1)                 ,
        IsSoftDeleted    BIT               NOT NULL CONSTRAINT DF_UserSessions_IsSoftDeleted DEFAULT (0)            ,
        IsDeleted        BIT               NOT NULL CONSTRAINT DF_UserSessions_IsDeleted DEFAULT (0)                ,
        CreatedBy        INT               NULL                                                                     ,
        CreatedOn        DATETIME2         NOT NULL CONSTRAINT DF_UserSessions_CreatedOn DEFAULT (SYSUTCDATETIME()) ,
        ModifiedBy       INT               NULL                                                                     ,
        ModifiedOn       DATETIME2         NULL                                                                     ,

        CONSTRAINT PK_UserSessions PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_UserSessions_Users_UserId FOREIGN KEY (UserId) REFERENCES Users (Id)
    );

    CREATE UNIQUE INDEX IX_UserSessions_RefreshTokenHash ON UserSessions (RefreshTokenHash);
    CREATE INDEX IX_UserSessions_UserId ON UserSessions (UserId);
END
GO
