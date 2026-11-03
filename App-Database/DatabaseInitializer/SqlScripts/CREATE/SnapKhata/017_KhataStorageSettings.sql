IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KhataStorageSettings')
BEGIN
    CREATE TABLE KhataStorageSettings
    (
        Id              INT IDENTITY(1,1) NOT NULL                                                                        ,
        Provider        TINYINT           NOT NULL                                                                        ,
        Enabled         BIT               NOT NULL                                                                        ,
        AccountName     NVARCHAR(64)      NULL                                                                            ,
        ContainerName   NVARCHAR(63)      NULL                                                                            ,
        SecretProtected NVARCHAR(MAX)     NULL                                                                            ,
        IsActive        BIT               NOT NULL CONSTRAINT DF_KhataStorageSettings_IsActive DEFAULT (1)                ,
        IsSoftDeleted   BIT               NOT NULL CONSTRAINT DF_KhataStorageSettings_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted       BIT               NOT NULL CONSTRAINT DF_KhataStorageSettings_IsDeleted DEFAULT (0)               ,
        CreatedBy       INT               NULL                                                                            ,
        CreatedOn       DATETIME2         NOT NULL CONSTRAINT DF_KhataStorageSettings_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy      INT               NULL                                                                            ,
        ModifiedOn      DATETIME2         NULL                                                                            ,

        CONSTRAINT PK_KhataStorageSettings PRIMARY KEY CLUSTERED (Id)
    );
END
GO
