IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KhataNotificationPrefs')
BEGIN
    CREATE TABLE KhataNotificationPrefs
    (
        Id                     INT IDENTITY(1,1) NOT NULL                                                                          ,
        ContactId              INT               NOT NULL                                                                          ,
        NotifyPush             BIT               NOT NULL CONSTRAINT DF_KhataNotificationPrefs_NotifyPush DEFAULT (0)              ,
        NotifySms              BIT               NOT NULL CONSTRAINT DF_KhataNotificationPrefs_NotifySms DEFAULT (0)               ,
        NotifyEmail            BIT               NOT NULL CONSTRAINT DF_KhataNotificationPrefs_NotifyEmail DEFAULT (0)             ,
        ConsentChangedByUserId INT               NULL                                                                              ,
        ConsentChangedOn       DATETIME2         NULL                                                                              ,
        IsActive               BIT               NOT NULL CONSTRAINT DF_KhataNotificationPrefs_IsActive DEFAULT (1)                ,
        IsSoftDeleted          BIT               NOT NULL CONSTRAINT DF_KhataNotificationPrefs_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted              BIT               NOT NULL CONSTRAINT DF_KhataNotificationPrefs_IsDeleted DEFAULT (0)               ,
        CreatedBy              INT               NULL                                                                              ,
        CreatedOn              DATETIME2         NOT NULL CONSTRAINT DF_KhataNotificationPrefs_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy             INT               NULL                                                                              ,
        ModifiedOn             DATETIME2         NULL                                                                              ,

        CONSTRAINT PK_KhataNotificationPrefs PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_KhataNotificationPrefs_KhataContacts_ContactId FOREIGN KEY (ContactId) REFERENCES KhataContacts (Id),
        CONSTRAINT FK_KhataNotificationPrefs_KhataUsers_ConsentChangedByUserId FOREIGN KEY (ConsentChangedByUserId) REFERENCES KhataUsers (Id)
    );

    CREATE UNIQUE INDEX IX_KhataNotificationPrefs_ContactId ON KhataNotificationPrefs (ContactId);
END
GO
