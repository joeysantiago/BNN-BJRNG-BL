IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'UserFeatures')
BEGIN
    CREATE TABLE UserFeatures
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                                ,
        UserId        INT               NOT NULL                                                                ,
        FeatureId     INT               NOT NULL                                                                ,
        IsEnabled     BIT               NOT NULL CONSTRAINT DF_UserFeatures_IsEnabled DEFAULT (1)               ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_UserFeatures_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_UserFeatures_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_UserFeatures_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                                    ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_UserFeatures_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                                    ,
        ModifiedOn    DATETIME2         NULL                                                                    ,

        CONSTRAINT PK_UserFeatures PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_UserFeatures_Users_UserId FOREIGN KEY (UserId) REFERENCES Users (Id),
        CONSTRAINT FK_UserFeatures_Features_FeatureId FOREIGN KEY (FeatureId) REFERENCES Features (Id)
    );

    CREATE UNIQUE INDEX IX_UserFeatures_UserId_FeatureId ON UserFeatures (UserId, FeatureId);
END
GO
