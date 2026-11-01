IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KhataGoogleConnections')
BEGIN
    CREATE TABLE KhataGoogleConnections
    (
        Id                    INT IDENTITY(1,1) NOT NULL                                                                            ,
        UserId                INT               NOT NULL                                                                            ,
        GoogleSubject         VARCHAR(64)       NOT NULL                                                                            ,
        GoogleEmail           NVARCHAR(256)     NOT NULL                                                                            ,
        RefreshTokenEncrypted NVARCHAR(MAX)     NOT NULL                                                                            ,
        Scopes                NVARCHAR(500)     NOT NULL                                                                            ,
        RootFolderId          VARCHAR(100)      NULL                                                                                ,
        Status                TINYINT           NOT NULL CONSTRAINT DF_KhataGoogleConnections_Status DEFAULT (1)                    ,
        LastError             NVARCHAR(500)     NULL                                                                                ,
        ConnectedOn           DATETIME2         NOT NULL CONSTRAINT DF_KhataGoogleConnections_ConnectedOn DEFAULT (SYSUTCDATETIME()),
        RevokedOn             DATETIME2         NULL                                                                                ,
        IsActive              BIT               NOT NULL CONSTRAINT DF_KhataGoogleConnections_IsActive DEFAULT (1)                  ,
        IsSoftDeleted         BIT               NOT NULL CONSTRAINT DF_KhataGoogleConnections_IsSoftDeleted DEFAULT (0)             ,
        IsDeleted             BIT               NOT NULL CONSTRAINT DF_KhataGoogleConnections_IsDeleted DEFAULT (0)                 ,
        CreatedBy             INT               NULL                                                                                ,
        CreatedOn             DATETIME2         NOT NULL CONSTRAINT DF_KhataGoogleConnections_CreatedOn DEFAULT (SYSUTCDATETIME())  ,
        ModifiedBy            INT               NULL                                                                                ,
        ModifiedOn            DATETIME2         NULL                                                                                ,

        CONSTRAINT PK_KhataGoogleConnections PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_KhataGoogleConnections_KhataUsers_UserId FOREIGN KEY (UserId) REFERENCES KhataUsers (Id)
    );

    CREATE UNIQUE INDEX IX_KhataGoogleConnections_UserId ON KhataGoogleConnections (UserId) WHERE RevokedOn IS NULL;
END
GO
