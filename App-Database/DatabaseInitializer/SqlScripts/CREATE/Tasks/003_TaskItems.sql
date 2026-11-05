-- The tasks. DueDate / DueTime are the user's local calendar; Priority 1 = low, 2 = medium, 3 = high. RepeatType: none, daily, weekly, monthly, yearly, custom (RepeatEvery x RepeatUnit).
-- A deleted task is soft-deleted (IsSoftDeleted, DeletedOn) and can be restored.
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TaskItems')
BEGIN
    CREATE TABLE TaskItems
    (
        Id              INT IDENTITY(1,1) NOT NULL                                                             ,
        UserId          INT               NOT NULL                                                             ,
        CategoryId      INT               NULL                                                                 ,
        Title           NVARCHAR(120)     NOT NULL                                                             ,
        Description     NVARCHAR(2000)    NULL                                                                 ,
        DueDate         DATE              NULL                                                                 ,
        DueTime         TIME(0)           NULL                                                                 ,
        Priority        INT               NOT NULL                                                             ,
        IsStarted       BIT               NOT NULL CONSTRAINT DF_TaskItems_IsStarted DEFAULT (0)               ,
        RemindEnabled   BIT               NOT NULL CONSTRAINT DF_TaskItems_RemindEnabled DEFAULT (1)           ,
        RepeatType      VARCHAR(10)       NOT NULL                                                             ,
        RepeatEvery     INT               NOT NULL                                                             ,
        RepeatUnit      VARCHAR(10)       NOT NULL                                                             ,
        RepeatSpawned   BIT               NOT NULL CONSTRAINT DF_TaskItems_RepeatSpawned DEFAULT (0)           ,
        CompletedOn     DATETIME2         NULL                                                                 ,
        LastCompletedOn DATETIME2         NULL                                                                 ,
        DeletedOn       DATETIME2         NULL                                                                 ,
        IsActive        BIT               NOT NULL CONSTRAINT DF_TaskItems_IsActive DEFAULT (1)                ,
        IsSoftDeleted   BIT               NOT NULL CONSTRAINT DF_TaskItems_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted       BIT               NOT NULL CONSTRAINT DF_TaskItems_IsDeleted DEFAULT (0)               ,
        CreatedBy       INT               NULL                                                                 ,
        CreatedOn       DATETIME2         NOT NULL CONSTRAINT DF_TaskItems_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy      INT               NULL                                                                 ,
        ModifiedOn      DATETIME2         NULL                                                                 ,

        CONSTRAINT PK_TaskItems PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_TaskItems_TaskUsers_UserId FOREIGN KEY (UserId) REFERENCES TaskUsers (Id),
        CONSTRAINT FK_TaskItems_TaskCategories_CategoryId FOREIGN KEY (CategoryId) REFERENCES TaskCategories (Id)
    );

    CREATE INDEX IX_TaskItems_UserId_DueDate ON TaskItems (UserId, DueDate);
    CREATE INDEX IX_TaskItems_CategoryId ON TaskItems (CategoryId);
END
GO
