-- Reminders the server sent (or tried) for a task: Kind (due, overdue, upcoming) on ForDate, the local date of the user, through Channel (whatsapp). One per task, kind and day.
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TaskReminderLogs')
BEGIN
    CREATE TABLE TaskReminderLogs
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                                    ,
        TaskId        INT               NOT NULL                                                                    ,
        Channel       VARCHAR(20)       NOT NULL                                                                    ,
        Kind          VARCHAR(20)       NOT NULL                                                                    ,
        ForDate       DATE              NOT NULL                                                                    ,
        Status        VARCHAR(20)       NOT NULL                                                                    ,
        Error         VARCHAR(100)      NULL                                                                        ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_TaskReminderLogs_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_TaskReminderLogs_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_TaskReminderLogs_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                                        ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_TaskReminderLogs_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                                        ,
        ModifiedOn    DATETIME2         NULL                                                                        ,

        CONSTRAINT PK_TaskReminderLogs PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_TaskReminderLogs_TaskItems_TaskId FOREIGN KEY (TaskId) REFERENCES TaskItems (Id)
    );

    CREATE UNIQUE INDEX IX_TaskReminderLogs_TaskId_Channel_Kind_ForDate ON TaskReminderLogs (TaskId, Channel, Kind, ForDate);
END
GO
