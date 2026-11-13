-- What the user taught SnapTracker: every later transaction of this merchant (MerchantKey, lower case) goes to this category (CategoryCode) and/or counts
-- towards this flow (FlowCode, for example a family member's transfers as money borrowed).
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TrackerCategoryRules')
BEGIN
    CREATE TABLE TrackerCategoryRules
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                                        ,
        TrackerUserId INT               NOT NULL                                                                        ,
        MerchantKey   NVARCHAR(60)      NOT NULL                                                                        ,
        CategoryCode  VARCHAR(20)       NULL                                                                            ,
        FlowCode      VARCHAR(16)       NULL                                                                            ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_TrackerCategoryRules_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_TrackerCategoryRules_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_TrackerCategoryRules_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                                            ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_TrackerCategoryRules_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                                            ,
        ModifiedOn    DATETIME2         NULL                                                                            ,

        CONSTRAINT PK_TrackerCategoryRules PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_TrackerCategoryRules_TrackerUsers_TrackerUserId FOREIGN KEY (TrackerUserId) REFERENCES TrackerUsers (Id)
    );

    CREATE UNIQUE INDEX IX_TrackerCategoryRules_TrackerUserId_MerchantKey ON TrackerCategoryRules (TrackerUserId, MerchantKey);
END
GO
