IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'RolePermissions')
BEGIN
    CREATE TABLE RolePermissions
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                                   ,
        RoleId        INT               NOT NULL                                                                   ,
        PageId        INT               NOT NULL                                                                   ,
        CanView       BIT               NOT NULL CONSTRAINT DF_RolePermissions_CanView DEFAULT (0)                 ,
        CanAdd        BIT               NOT NULL CONSTRAINT DF_RolePermissions_CanAdd DEFAULT (0)                  ,
        CanEdit       BIT               NOT NULL CONSTRAINT DF_RolePermissions_CanEdit DEFAULT (0)                 ,
        CanDelete     BIT               NOT NULL CONSTRAINT DF_RolePermissions_CanDelete DEFAULT (0)               ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_RolePermissions_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_RolePermissions_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_RolePermissions_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                                       ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_RolePermissions_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                                       ,
        ModifiedOn    DATETIME2         NULL                                                                       ,

        CONSTRAINT PK_RolePermissions PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_RolePermissions_Roles_RoleId FOREIGN KEY (RoleId) REFERENCES Roles (Id),
        CONSTRAINT FK_RolePermissions_Pages_PageId FOREIGN KEY (PageId) REFERENCES Pages (Id)
    );

    CREATE UNIQUE INDEX IX_RolePermissions_RoleId_PageId ON RolePermissions (RoleId, PageId);
END
GO
