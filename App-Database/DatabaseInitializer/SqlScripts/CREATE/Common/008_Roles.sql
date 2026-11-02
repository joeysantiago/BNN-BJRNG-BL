IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Roles')
BEGIN
    CREATE TABLE Roles
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                         ,
        Code          NVARCHAR(50)      NOT NULL                                                         ,
        Name          NVARCHAR(100)     NOT NULL                                                         ,
        Description   NVARCHAR(250)     NULL                                                             ,
        IsSystem      BIT               NOT NULL CONSTRAINT DF_Roles_IsSystem DEFAULT (0)                ,
        IsDefault     BIT               NOT NULL CONSTRAINT DF_Roles_IsDefault DEFAULT (0)               ,
        SortOrder     INT               NOT NULL CONSTRAINT DF_Roles_SortOrder DEFAULT (0)               ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_Roles_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_Roles_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_Roles_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                             ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_Roles_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                             ,
        ModifiedOn    DATETIME2         NULL                                                             ,

        CONSTRAINT PK_Roles PRIMARY KEY CLUSTERED (Id)
    );

    CREATE UNIQUE INDEX IX_Roles_Code ON Roles (Code);
END
GO
