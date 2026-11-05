-- Categories of one user's tasks. Code is set for the built-in ones (Tasks:NewUser:Categories); Marketing (IsSystem) cannot be renamed or deleted.
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TaskCategories')
BEGIN
    CREATE TABLE TaskCategories
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                                  ,
        UserId        INT               NOT NULL                                                                  ,
        Code          VARCHAR(30)       NULL                                                                      ,
        Name          NVARCHAR(40)      NOT NULL                                                                  ,
        Color         VARCHAR(9)        NOT NULL                                                                  ,
        IsSystem      BIT               NOT NULL CONSTRAINT DF_TaskCategories_IsSystem DEFAULT (0)                ,
        SortOrder     INT               NOT NULL CONSTRAINT DF_TaskCategories_SortOrder DEFAULT (0)               ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_TaskCategories_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_TaskCategories_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_TaskCategories_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                                      ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_TaskCategories_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                                      ,
        ModifiedOn    DATETIME2         NULL                                                                      ,

        CONSTRAINT PK_TaskCategories PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_TaskCategories_TaskUsers_UserId FOREIGN KEY (UserId) REFERENCES TaskUsers (Id)
    );

    CREATE INDEX IX_TaskCategories_UserId ON TaskCategories (UserId);
END
GO
