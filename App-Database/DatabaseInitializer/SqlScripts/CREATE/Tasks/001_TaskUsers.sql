-- The My Tasks profile of a common account: its own App Lock PIN (hashed) and preferences. Starting values come from Tasks:NewUser (appsettings.json).
-- TimeZone is the IANA zone of the user (the app sends the one of the device), so WhatsApp reminders follow their local day; the number is the Mobile of UserProfiles.
-- DefaultCategoryId points at TaskCategories (no foreign key: the categories are made after the profile).
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TaskUsers')
BEGIN
    CREATE TABLE TaskUsers
    (
        Id                   INT IDENTITY(1,1) NOT NULL                                                             ,
        UserId               INT               NOT NULL                                                             ,
        PinHash              VARCHAR(200)      NULL                                                                 ,
        PinFailedCount       INT               NOT NULL CONSTRAINT DF_TaskUsers_PinFailedCount DEFAULT (0)          ,
        PinLockedUntil       DATETIME2         NULL                                                                 ,
        LockAfterMinutes     INT               NOT NULL                                                             ,
        NotificationsEnabled BIT               NOT NULL                                                             ,
        ReminderTime         VARCHAR(5)        NOT NULL                                                             ,
        RemindBefore         VARCHAR(5)        NOT NULL                                                             ,
        OverdueReminders     BIT               NOT NULL                                                             ,
        UpcomingReminders    BIT               NOT NULL                                                             ,
        WeekStart            VARCHAR(3)        NOT NULL                                                             ,
        DefaultTab           VARCHAR(10)       NOT NULL                                                             ,
        DefaultPriority      INT               NOT NULL                                                             ,
        DefaultCategoryId    INT               NULL                                                                 ,
        WhatsAppReminders    BIT               NOT NULL CONSTRAINT DF_TaskUsers_WhatsAppReminders DEFAULT (0)       ,
        TimeZone             VARCHAR(64)       NOT NULL                                                             ,
        IsActive             BIT               NOT NULL CONSTRAINT DF_TaskUsers_IsActive DEFAULT (1)                ,
        IsSoftDeleted        BIT               NOT NULL CONSTRAINT DF_TaskUsers_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted            BIT               NOT NULL CONSTRAINT DF_TaskUsers_IsDeleted DEFAULT (0)               ,
        CreatedBy            INT               NULL                                                                 ,
        CreatedOn            DATETIME2         NOT NULL CONSTRAINT DF_TaskUsers_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy           INT               NULL                                                                 ,
        ModifiedOn           DATETIME2         NULL                                                                 ,

        CONSTRAINT PK_TaskUsers PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_TaskUsers_Users_UserId FOREIGN KEY (UserId) REFERENCES Users (Id)
    );

    CREATE UNIQUE INDEX IX_TaskUsers_UserId ON TaskUsers (UserId);
END
GO
