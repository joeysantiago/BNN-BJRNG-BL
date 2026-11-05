-- What happened to a task: created, edited, completed, reopened, deleted, restored, duplicated, repeated. CreatedOn is the time.
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TaskHistory')
BEGIN
    CREATE TABLE TaskHistory
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                               ,
        TaskId        INT               NOT NULL                                                               ,
        Action        VARCHAR(30)       NOT NULL                                                               ,
        Detail        NVARCHAR(400)     NULL                                                                   ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_TaskHistory_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_TaskHistory_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_TaskHistory_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                                   ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_TaskHistory_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                                   ,
        ModifiedOn    DATETIME2         NULL                                                                   ,

        CONSTRAINT PK_TaskHistory PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_TaskHistory_TaskItems_TaskId FOREIGN KEY (TaskId) REFERENCES TaskItems (Id)
    );

    CREATE INDEX IX_TaskHistory_TaskId ON TaskHistory (TaskId);
END
GO
