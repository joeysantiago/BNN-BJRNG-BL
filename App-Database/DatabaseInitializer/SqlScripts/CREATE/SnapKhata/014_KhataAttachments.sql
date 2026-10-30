IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KhataAttachments')
BEGIN
    CREATE TABLE KhataAttachments
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                                    ,
        TransactionId INT               NOT NULL                                                                    ,
        FileName      NVARCHAR(260)     NOT NULL                                                                    ,
        ContentType   VARCHAR(100)      NOT NULL                                                                    ,
        SizeBytes     BIGINT            NOT NULL                                                                    ,
        Md5           CHAR(32)          NOT NULL                                                                    ,
        TempPath      NVARCHAR(400)     NULL                                                                        ,
        SortOrder     INT               NOT NULL CONSTRAINT DF_KhataAttachments_SortOrder DEFAULT (0)               ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_KhataAttachments_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_KhataAttachments_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_KhataAttachments_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                                        ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_KhataAttachments_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                                        ,
        ModifiedOn    DATETIME2         NULL                                                                        ,

        CONSTRAINT PK_KhataAttachments PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_KhataAttachments_KhataTransactions_TransactionId FOREIGN KEY (TransactionId) REFERENCES KhataTransactions (Id)
    );

    CREATE INDEX IX_KhataAttachments_TransactionId ON KhataAttachments (TransactionId);
END
GO
