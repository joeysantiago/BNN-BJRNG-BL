IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Users')
BEGIN
    CREATE TABLE Users
    (
        Id               INT IDENTITY(1,1) NOT NULL                                                         ,
        Email            NVARCHAR(256)     NOT NULL                                                         ,
        PasswordHash     NVARCHAR(200)     NOT NULL                                                         ,
        DisplayName      NVARCHAR(100)     NOT NULL CONSTRAINT DF_Users_DisplayName DEFAULT (N'')           ,
        Language         VARCHAR(5)        NOT NULL CONSTRAINT DF_Users_Language DEFAULT ('en')             ,
        IsAdmin          BIT               NOT NULL CONSTRAINT DF_Users_IsAdmin DEFAULT (0)                 ,
        FailedLoginCount INT               NOT NULL CONSTRAINT DF_Users_FailedLoginCount DEFAULT (0)        ,
        LockedUntil      DATETIME2         NULL                                                             ,
        LastLoginOn      DATETIME2         NULL                                                             ,
        IsActive         BIT               NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT (1)                ,
        IsSoftDeleted    BIT               NOT NULL CONSTRAINT DF_Users_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted        BIT               NOT NULL CONSTRAINT DF_Users_IsDeleted DEFAULT (0)               ,
        CreatedBy        INT               NULL                                                             ,
        CreatedOn        DATETIME2         NOT NULL CONSTRAINT DF_Users_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy       INT               NULL                                                             ,
        ModifiedOn       DATETIME2         NULL                                                             ,

        CONSTRAINT PK_Users PRIMARY KEY CLUSTERED (Id)
    );

    CREATE UNIQUE INDEX IX_Users_Email ON Users (Email);
END
GO
