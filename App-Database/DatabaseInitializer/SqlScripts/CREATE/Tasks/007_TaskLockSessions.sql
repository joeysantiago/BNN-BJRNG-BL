-- The My Tasks App Lock of one login session: unlocked until UnlockedUntil. Separate from SnapKhata's lock.
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TaskLockSessions')
BEGIN
    CREATE TABLE TaskLockSessions
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                                    ,
        UserId        INT               NOT NULL                                                                    ,
        SessionId     INT               NOT NULL                                                                    ,
        UnlockedUntil DATETIME2         NULL                                                                        ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_TaskLockSessions_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_TaskLockSessions_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_TaskLockSessions_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                                        ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_TaskLockSessions_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                                        ,
        ModifiedOn    DATETIME2         NULL                                                                        ,

        CONSTRAINT PK_TaskLockSessions PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_TaskLockSessions_TaskUsers_UserId FOREIGN KEY (UserId) REFERENCES TaskUsers (Id),
        CONSTRAINT FK_TaskLockSessions_UserSessions_SessionId FOREIGN KEY (SessionId) REFERENCES UserSessions (Id)
    );

    CREATE UNIQUE INDEX IX_TaskLockSessions_SessionId ON TaskLockSessions (SessionId);
    CREATE INDEX IX_TaskLockSessions_UserId ON TaskLockSessions (UserId);
END
GO
