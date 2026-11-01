IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KhataOAuthStates')
BEGIN
    CREATE TABLE KhataOAuthStates
    (
        Id                    INT IDENTITY(1,1) NOT NULL                                                                    ,
        Purpose               TINYINT           NOT NULL                                                                    ,
        UserId                INT               NULL                                                                        ,
        State                 VARCHAR(100)      NOT NULL                                                                    ,
        CodeVerifierEncrypted NVARCHAR(500)     NOT NULL                                                                    ,
        NextUrl               NVARCHAR(500)     NULL                                                                        ,
        ExpiresOn             DATETIME2         NOT NULL                                                                    ,
        ConsumedOn            DATETIME2         NULL                                                                        ,
        IsActive              BIT               NOT NULL CONSTRAINT DF_KhataOAuthStates_IsActive DEFAULT (1)                ,
        IsSoftDeleted         BIT               NOT NULL CONSTRAINT DF_KhataOAuthStates_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted             BIT               NOT NULL CONSTRAINT DF_KhataOAuthStates_IsDeleted DEFAULT (0)               ,
        CreatedBy             INT               NULL                                                                        ,
        CreatedOn             DATETIME2         NOT NULL CONSTRAINT DF_KhataOAuthStates_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy            INT               NULL                                                                        ,
        ModifiedOn            DATETIME2         NULL                                                                        ,

        CONSTRAINT PK_KhataOAuthStates PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_KhataOAuthStates_KhataUsers_UserId FOREIGN KEY (UserId) REFERENCES KhataUsers (Id)
    );

    CREATE UNIQUE INDEX IX_KhataOAuthStates_State ON KhataOAuthStates (State);
END
GO
