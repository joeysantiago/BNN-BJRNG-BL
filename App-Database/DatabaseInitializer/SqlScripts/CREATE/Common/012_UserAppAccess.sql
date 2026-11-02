IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'UserAppAccess')
BEGIN
    CREATE TABLE UserAppAccess
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                                 ,
        UserId        INT               NOT NULL                                                                 ,
        AppId         INT               NOT NULL                                                                 ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_UserAppAccess_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_UserAppAccess_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_UserAppAccess_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                                     ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_UserAppAccess_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                                     ,
        ModifiedOn    DATETIME2         NULL                                                                     ,

        CONSTRAINT PK_UserAppAccess PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_UserAppAccess_Users_UserId FOREIGN KEY (UserId) REFERENCES Users (Id),
        CONSTRAINT FK_UserAppAccess_Apps_AppId FOREIGN KEY (AppId) REFERENCES Apps (Id)
    );

    CREATE UNIQUE INDEX IX_UserAppAccess_UserId_AppId ON UserAppAccess (UserId, AppId);
END
GO
