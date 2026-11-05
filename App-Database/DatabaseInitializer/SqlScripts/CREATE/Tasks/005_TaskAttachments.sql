-- Pictures of a task. FileId is the path under Tasks:LocalFiles:Root (App-Data/tasks, never committed); only the owner of the task can open it.
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TaskAttachments')
BEGIN
    CREATE TABLE TaskAttachments
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                                   ,
        TaskId        INT               NOT NULL                                                                   ,
        FileId        NVARCHAR(300)     NOT NULL                                                                   ,
        FileName      NVARCHAR(260)     NOT NULL                                                                   ,
        ContentType   VARCHAR(100)      NOT NULL                                                                   ,
        SizeBytes     BIGINT            NOT NULL                                                                   ,
        SortOrder     INT               NOT NULL CONSTRAINT DF_TaskAttachments_SortOrder DEFAULT (0)               ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_TaskAttachments_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_TaskAttachments_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_TaskAttachments_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                                       ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_TaskAttachments_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                                       ,
        ModifiedOn    DATETIME2         NULL                                                                       ,

        CONSTRAINT PK_TaskAttachments PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_TaskAttachments_TaskItems_TaskId FOREIGN KEY (TaskId) REFERENCES TaskItems (Id)
    );

    CREATE INDEX IX_TaskAttachments_TaskId ON TaskAttachments (TaskId);
END
GO
