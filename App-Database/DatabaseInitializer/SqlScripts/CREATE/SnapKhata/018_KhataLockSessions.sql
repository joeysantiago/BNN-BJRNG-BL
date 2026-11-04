IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KhataLockSessions')
BEGIN
    CREATE TABLE KhataLockSessions
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                                      ,
        UserId        INT               NOT NULL                                                                      ,
        SessionId     INT               NOT NULL                                                                      ,
        UnlockedUntil DATETIME2         NULL                                                                          ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_KhataLockSessions_IsActive DEFAULT (1)                 ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_KhataLockSessions_IsSoftDeleted DEFAULT (0)            ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_KhataLockSessions_IsDeleted DEFAULT (0)                ,
        CreatedBy     INT               NULL                                                                          ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_KhataLockSessions_CreatedOn DEFAULT (SYSUTCDATETIME()) ,
        ModifiedBy    INT               NULL                                                                          ,
        ModifiedOn    DATETIME2         NULL                                                                          ,

        CONSTRAINT PK_KhataLockSessions PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_KhataLockSessions_KhataUsers_UserId FOREIGN KEY (UserId) REFERENCES KhataUsers (Id),
        CONSTRAINT FK_KhataLockSessions_UserSessions_SessionId FOREIGN KEY (SessionId) REFERENCES UserSessions (Id)
    );

    CREATE UNIQUE INDEX IX_KhataLockSessions_SessionId ON KhataLockSessions (SessionId);
    CREATE INDEX IX_KhataLockSessions_UserId ON KhataLockSessions (UserId);
END
GO
