-- An alert of the bell list. Its title and line are built in the user's language from the type (tracker.alert.<type>) and Args (JSON: merchant, amount,
-- credit), never stored as a sentence. TransactionId has no foreign key: deleting a transaction keeps the alert, which then opens nothing.
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TrackerAlerts')
BEGIN
    CREATE TABLE TrackerAlerts
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                                 ,
        TrackerUserId INT               NOT NULL                                                                 ,
        Type          VARCHAR(12)       NOT NULL                                                                 ,
        TransactionId INT               NULL                                                                     ,
        Args          NVARCHAR(400)     NOT NULL                                                                 ,
        IsRead        BIT               NOT NULL CONSTRAINT DF_TrackerAlerts_IsRead DEFAULT (0)                  ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_TrackerAlerts_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_TrackerAlerts_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_TrackerAlerts_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                                     ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_TrackerAlerts_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                                     ,
        ModifiedOn    DATETIME2         NULL                                                                     ,

        CONSTRAINT PK_TrackerAlerts PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_TrackerAlerts_TrackerUsers_TrackerUserId FOREIGN KEY (TrackerUserId) REFERENCES TrackerUsers (Id)
    );

    CREATE INDEX IX_TrackerAlerts_TrackerUserId ON TrackerAlerts (TrackerUserId);
END
GO
