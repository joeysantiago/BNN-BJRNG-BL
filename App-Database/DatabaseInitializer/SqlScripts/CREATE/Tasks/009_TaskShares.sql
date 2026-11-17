-- Tasks shared with other accounts. UserId is the account (Users.Id) the task is shared with; SharedWith is the e-mail or mobile number the owner typed (shown to the owner instead of the other account's own details).
-- Permission: read | edit. Status: pending (waiting for the person to accept) | accepted | declined. Sharing again with the same person reuses the row.
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TaskShares')
BEGIN
    CREATE TABLE TaskShares
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                              ,
        TaskId        INT               NOT NULL                                                              ,
        UserId        INT               NOT NULL                                                              ,
        SharedWith    NVARCHAR(256)     NOT NULL                                                              ,
        Permission    VARCHAR(10)       NOT NULL                                                              ,
        Status        VARCHAR(10)       NOT NULL                                                              ,
        RespondedOn   DATETIME2         NULL                                                                  ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_TaskShares_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_TaskShares_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_TaskShares_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                                  ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_TaskShares_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                                  ,
        ModifiedOn    DATETIME2         NULL                                                                  ,

        CONSTRAINT PK_TaskShares PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_TaskShares_TaskItems_TaskId FOREIGN KEY (TaskId) REFERENCES TaskItems (Id),
        CONSTRAINT FK_TaskShares_Users_UserId FOREIGN KEY (UserId) REFERENCES Users (Id)
    );

    CREATE UNIQUE INDEX UX_TaskShares_TaskId_UserId ON TaskShares (TaskId, UserId);
    CREATE INDEX IX_TaskShares_UserId_Status ON TaskShares (UserId, Status);
END
GO
