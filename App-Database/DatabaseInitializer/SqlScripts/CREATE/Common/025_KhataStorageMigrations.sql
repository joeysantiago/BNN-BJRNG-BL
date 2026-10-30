IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KhataStorageMigrations')
BEGIN
    CREATE TABLE KhataStorageMigrations
    (
        Id               INT IDENTITY(1,1) NOT NULL                                                                          ,
        UserId           INT               NOT NULL                                                                          ,
        FromProvider     TINYINT           NOT NULL                                                                          ,
        FromConnectionId INT               NULL                                                                              ,
        ToProvider       TINYINT           NOT NULL                                                                          ,
        ToConnectionId   INT               NULL                                                                              ,
        Status           TINYINT           NOT NULL CONSTRAINT DF_KhataStorageMigrations_Status DEFAULT (1)                  ,
        TotalFiles       INT               NOT NULL CONSTRAINT DF_KhataStorageMigrations_TotalFiles DEFAULT (0)              ,
        MovedFiles       INT               NOT NULL CONSTRAINT DF_KhataStorageMigrations_MovedFiles DEFAULT (0)              ,
        LeftBehindFiles  INT               NOT NULL CONSTRAINT DF_KhataStorageMigrations_LeftBehindFiles DEFAULT (0)         ,
        StartedOn        DATETIME2         NULL                                                                              ,
        CompletedOn      DATETIME2         NULL                                                                              ,
        LastError        NVARCHAR(500)     NULL                                                                              ,
        IsActive         BIT               NOT NULL CONSTRAINT DF_KhataStorageMigrations_IsActive DEFAULT (1)                ,
        IsSoftDeleted    BIT               NOT NULL CONSTRAINT DF_KhataStorageMigrations_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted        BIT               NOT NULL CONSTRAINT DF_KhataStorageMigrations_IsDeleted DEFAULT (0)               ,
        CreatedBy        INT               NULL                                                                              ,
        CreatedOn        DATETIME2         NOT NULL CONSTRAINT DF_KhataStorageMigrations_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy       INT               NULL                                                                              ,
        ModifiedOn       DATETIME2         NULL                                                                              ,

        CONSTRAINT PK_KhataStorageMigrations PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_KhataStorageMigrations_KhataUsers_UserId FOREIGN KEY (UserId) REFERENCES KhataUsers (Id),
        CONSTRAINT FK_KhataStorageMigrations_KhataGoogleConnections_FromConnectionId FOREIGN KEY (FromConnectionId) REFERENCES KhataGoogleConnections (Id),
        CONSTRAINT FK_KhataStorageMigrations_KhataGoogleConnections_ToConnectionId FOREIGN KEY (ToConnectionId) REFERENCES KhataGoogleConnections (Id)
    );

    CREATE INDEX IX_KhataStorageMigrations_UserId ON KhataStorageMigrations (UserId);
END
GO
