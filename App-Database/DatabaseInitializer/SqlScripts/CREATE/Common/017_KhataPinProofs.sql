IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KhataPinProofs')
BEGIN
    CREATE TABLE KhataPinProofs
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                                  ,
        UserId        INT               NOT NULL                                                                  ,
        SessionId     INT               NOT NULL                                                                  ,
        Purpose       TINYINT           NOT NULL                                                                  ,
        TargetId      INT               NULL                                                                      ,
        ProofHash     CHAR(64)          NOT NULL                                                                  ,
        ExpiresOn     DATETIME2         NOT NULL                                                                  ,
        UsedOn        DATETIME2         NULL                                                                      ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_KhataPinProofs_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_KhataPinProofs_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_KhataPinProofs_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                                      ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_KhataPinProofs_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                                      ,
        ModifiedOn    DATETIME2         NULL                                                                      ,

        CONSTRAINT PK_KhataPinProofs PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_KhataPinProofs_KhataUsers_UserId FOREIGN KEY (UserId) REFERENCES KhataUsers (Id),
        CONSTRAINT FK_KhataPinProofs_KhataSessions_SessionId FOREIGN KEY (SessionId) REFERENCES KhataSessions (Id)
    );

    CREATE UNIQUE INDEX IX_KhataPinProofs_ProofHash ON KhataPinProofs (ProofHash);
END
GO
