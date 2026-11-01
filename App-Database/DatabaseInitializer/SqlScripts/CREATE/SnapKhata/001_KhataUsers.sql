IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KhataUsers')
BEGIN
    CREATE TABLE KhataUsers
    (
        Id                  INT IDENTITY(1,1) NOT NULL                                                              ,
        UserId              INT               NOT NULL                                                              ,
        DisplayName         NVARCHAR(100)     NOT NULL CONSTRAINT DF_KhataUsers_DisplayName DEFAULT (N'')           ,
        BusinessName        NVARCHAR(150)     NULL                                                                  ,
        Language            VARCHAR(5)        NOT NULL CONSTRAINT DF_KhataUsers_Language DEFAULT ('en')             ,
        TimeZone            VARCHAR(50)       NOT NULL CONSTRAINT DF_KhataUsers_TimeZone DEFAULT ('Asia/Kolkata')   ,
        GoogleSubject       VARCHAR(64)       NULL                                                                  ,
        StorageProvider     TINYINT           NOT NULL CONSTRAINT DF_KhataUsers_StorageProvider DEFAULT (0)         ,
        StorageSkippedOn    DATETIME2         NULL                                                                  ,
        LastBookId          INT               NULL                                                                  ,
        NotifyMePush        BIT               NOT NULL CONSTRAINT DF_KhataUsers_NotifyMePush DEFAULT (0)            ,
        NotifyMeEmail       BIT               NOT NULL CONSTRAINT DF_KhataUsers_NotifyMeEmail DEFAULT (0)           ,
        UpiId               VARCHAR(100)      NULL                                                                  ,
        UpiPayeeName        NVARCHAR(100)     NULL                                                                  ,
        UpiQrSource         TINYINT           NOT NULL CONSTRAINT DF_KhataUsers_UpiQrSource DEFAULT (0)             ,
        UpiQrStoredFileId   INT               NULL                                                                  ,
        DailySummaryEnabled BIT               NOT NULL CONSTRAINT DF_KhataUsers_DailySummaryEnabled DEFAULT (0)     ,
        DailySummaryTime    TIME(0)           NOT NULL CONSTRAINT DF_KhataUsers_DailySummaryTime DEFAULT ('21:00')  ,
        DailySummaryPush    BIT               NOT NULL CONSTRAINT DF_KhataUsers_DailySummaryPush DEFAULT (0)        ,
        DailySummaryEmail   BIT               NOT NULL CONSTRAINT DF_KhataUsers_DailySummaryEmail DEFAULT (0)       ,
        LastDailySummaryOn  DATE              NULL                                                                  ,
        DeletionScheduledOn DATETIME2         NULL                                                                  ,
        DeletionDeleteFiles BIT               NULL                                                                  ,
        IsActive            BIT               NOT NULL CONSTRAINT DF_KhataUsers_IsActive DEFAULT (1)                ,
        IsSoftDeleted       BIT               NOT NULL CONSTRAINT DF_KhataUsers_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted           BIT               NOT NULL CONSTRAINT DF_KhataUsers_IsDeleted DEFAULT (0)               ,
        CreatedBy           INT               NULL                                                                  ,
        CreatedOn           DATETIME2         NOT NULL CONSTRAINT DF_KhataUsers_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy          INT               NULL                                                                  ,
        ModifiedOn          DATETIME2         NULL                                                                  ,

        CONSTRAINT PK_KhataUsers PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_KhataUsers_Users_UserId FOREIGN KEY (UserId) REFERENCES Users (Id)
    );

    CREATE UNIQUE INDEX IX_KhataUsers_UserId ON KhataUsers (UserId);
    CREATE UNIQUE INDEX IX_KhataUsers_GoogleSubject ON KhataUsers (GoogleSubject) WHERE GoogleSubject IS NOT NULL;
END
GO
