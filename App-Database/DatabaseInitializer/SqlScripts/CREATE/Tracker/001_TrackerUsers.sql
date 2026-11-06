-- The SnapTracker profile of a common account: what happens to a new SMS transaction, which alerts it gets, SMS reading on the phone, and how many
-- messages were ignored before anything was read (OTPs, promotions, failed payments, others). Starting values come from Tracker:NewUser (appsettings.json).
-- AlertTypes lists the alert types that are on, separated by commas (newTx,categorized,verify,duplicate,revoked,paused,sync).
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TrackerUsers')
BEGIN
    CREATE TABLE TrackerUsers
    (
        Id                 INT IDENTITY(1,1) NOT NULL                                                                ,
        UserId             INT               NOT NULL                                                                ,
        ApprovalMode       VARCHAR(10)       NOT NULL                                                                ,
        AutoApprovePercent INT               NOT NULL                                                                ,
        PushEnabled        BIT               NOT NULL                                                                ,
        AlertTypes         VARCHAR(200)      NOT NULL                                                                ,
        TrackingState      VARCHAR(12)       NOT NULL                                                                ,
        TrackingSince      DATETIME2         NULL                                                                    ,
        FilteredOtp        INT               NOT NULL CONSTRAINT DF_TrackerUsers_FilteredOtp DEFAULT (0)             ,
        FilteredPromo      INT               NOT NULL CONSTRAINT DF_TrackerUsers_FilteredPromo DEFAULT (0)           ,
        FilteredFailed     INT               NOT NULL CONSTRAINT DF_TrackerUsers_FilteredFailed DEFAULT (0)          ,
        FilteredOther      INT               NOT NULL CONSTRAINT DF_TrackerUsers_FilteredOther DEFAULT (0)           ,
        IsActive           BIT               NOT NULL CONSTRAINT DF_TrackerUsers_IsActive DEFAULT (1)                ,
        IsSoftDeleted      BIT               NOT NULL CONSTRAINT DF_TrackerUsers_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted          BIT               NOT NULL CONSTRAINT DF_TrackerUsers_IsDeleted DEFAULT (0)               ,
        CreatedBy          INT               NULL                                                                    ,
        CreatedOn          DATETIME2         NOT NULL CONSTRAINT DF_TrackerUsers_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy         INT               NULL                                                                    ,
        ModifiedOn         DATETIME2         NULL                                                                    ,

        CONSTRAINT PK_TrackerUsers PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_TrackerUsers_Users_UserId FOREIGN KEY (UserId) REFERENCES Users (Id)
    );

    CREATE UNIQUE INDEX IX_TrackerUsers_UserId ON TrackerUsers (UserId);
END
GO
