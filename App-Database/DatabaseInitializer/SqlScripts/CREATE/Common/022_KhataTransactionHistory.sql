IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KhataTransactionHistory')
BEGIN
    CREATE TABLE KhataTransactionHistory
    (
        Id              INT IDENTITY(1,1) NOT NULL                                                                           ,
        TransactionId   INT               NOT NULL                                                                           ,
        Version         INT               NOT NULL                                                                           ,
        ChangeType      TINYINT           NOT NULL                                                                           ,
        SnapshotJson    NVARCHAR(MAX)     NOT NULL                                                                           ,
        ChangedByUserId INT               NOT NULL                                                                           ,
        IsActive        BIT               NOT NULL CONSTRAINT DF_KhataTransactionHistory_IsActive DEFAULT (1)                ,
        IsSoftDeleted   BIT               NOT NULL CONSTRAINT DF_KhataTransactionHistory_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted       BIT               NOT NULL CONSTRAINT DF_KhataTransactionHistory_IsDeleted DEFAULT (0)               ,
        CreatedBy       INT               NULL                                                                               ,
        CreatedOn       DATETIME2         NOT NULL CONSTRAINT DF_KhataTransactionHistory_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy      INT               NULL                                                                               ,
        ModifiedOn      DATETIME2         NULL                                                                               ,

        CONSTRAINT PK_KhataTransactionHistory PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_KhataTransactionHistory_KhataTransactions_TransactionId FOREIGN KEY (TransactionId) REFERENCES KhataTransactions (Id),
        CONSTRAINT FK_KhataTransactionHistory_KhataUsers_ChangedByUserId FOREIGN KEY (ChangedByUserId) REFERENCES KhataUsers (Id)
    );

    CREATE UNIQUE INDEX IX_KhataTransactionHistory_TransactionId_Version ON KhataTransactionHistory (TransactionId, Version);
END
GO
