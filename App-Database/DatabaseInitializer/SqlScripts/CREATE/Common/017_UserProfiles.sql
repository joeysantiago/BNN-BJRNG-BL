IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'UserProfiles')
BEGIN
    CREATE TABLE UserProfiles
    (
        Id             INT IDENTITY(1,1) NOT NULL                                                                ,
        UserId         INT               NOT NULL                                                                ,
        Mobile         NVARCHAR(16)      NULL                                                                    ,
        AddressLine1   NVARCHAR(200)     NULL                                                                    ,
        AddressLine2   NVARCHAR(200)     NULL                                                                    ,
        City           NVARCHAR(100)     NULL                                                                    ,
        State          NVARCHAR(100)     NULL                                                                    ,
        PostalCode     NVARCHAR(20)      NULL                                                                    ,
        Country        NVARCHAR(100)     NULL                                                                    ,
        CompanyName    NVARCHAR(150)     NULL                                                                    ,
        CompanyTaxId   NVARCHAR(30)      NULL                                                                    ,
        CompanyEmail   NVARCHAR(256)     NULL                                                                    ,
        CompanyPhone   NVARCHAR(20)      NULL                                                                    ,
        CompanyAddress NVARCHAR(500)     NULL                                                                    ,
        IsActive       BIT               NOT NULL CONSTRAINT DF_UserProfiles_IsActive DEFAULT (1)                ,
        IsSoftDeleted  BIT               NOT NULL CONSTRAINT DF_UserProfiles_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted      BIT               NOT NULL CONSTRAINT DF_UserProfiles_IsDeleted DEFAULT (0)               ,
        CreatedBy      INT               NULL                                                                    ,
        CreatedOn      DATETIME2         NOT NULL CONSTRAINT DF_UserProfiles_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy     INT               NULL                                                                    ,
        ModifiedOn     DATETIME2         NULL                                                                    ,

        CONSTRAINT PK_UserProfiles PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_UserProfiles_Users_UserId FOREIGN KEY (UserId) REFERENCES Users (Id)
    );

    CREATE UNIQUE INDEX IX_UserProfiles_UserId ON UserProfiles (UserId);
    CREATE UNIQUE INDEX IX_UserProfiles_Mobile ON UserProfiles (Mobile) WHERE Mobile IS NOT NULL;
END
GO
