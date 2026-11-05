-- The checklist (subtasks) of a task, in SortOrder.
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TaskChecklistItems')
BEGIN
    CREATE TABLE TaskChecklistItems
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                                      ,
        TaskId        INT               NOT NULL                                                                      ,
        Text          NVARCHAR(200)     NOT NULL                                                                      ,
        IsDone        BIT               NOT NULL CONSTRAINT DF_TaskChecklistItems_IsDone DEFAULT (0)                  ,
        DoneOn        DATETIME2         NULL                                                                          ,
        SortOrder     INT               NOT NULL CONSTRAINT DF_TaskChecklistItems_SortOrder DEFAULT (0)               ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_TaskChecklistItems_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_TaskChecklistItems_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_TaskChecklistItems_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                                          ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_TaskChecklistItems_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                                          ,
        ModifiedOn    DATETIME2         NULL                                                                          ,

        CONSTRAINT PK_TaskChecklistItems PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_TaskChecklistItems_TaskItems_TaskId FOREIGN KEY (TaskId) REFERENCES TaskItems (Id)
    );

    CREATE INDEX IX_TaskChecklistItems_TaskId ON TaskChecklistItems (TaskId);
END
GO
