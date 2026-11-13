-- The original SMS of a transaction, kept apart so the user can delete the texts and keep the transactions. BodyProtected is encrypted with ASP.NET
-- Data Protection (TrackerSecretProtector) and never written to logs. Marks is a JSON list of the parts the reader used (amount, merchant, account, reference).
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TrackerSmsTexts')
BEGIN
    CREATE TABLE TrackerSmsTexts
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                                   ,
        TransactionId INT               NOT NULL                                                                   ,
        SenderHeader  VARCHAR(20)       NOT NULL                                                                   ,
        SenderName    NVARCHAR(60)      NOT NULL                                                                   ,
        BodyProtected NVARCHAR(MAX)     NOT NULL                                                                   ,
        BodyHash      VARCHAR(64)       NOT NULL                                                                   ,
        Marks         NVARCHAR(1000)    NOT NULL                                                                   ,
        ReceivedOn    DATETIME2         NOT NULL                                                                   ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_TrackerSmsTexts_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_TrackerSmsTexts_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_TrackerSmsTexts_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                                       ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_TrackerSmsTexts_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                                       ,
        ModifiedOn    DATETIME2         NULL                                                                       ,

        CONSTRAINT PK_TrackerSmsTexts PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_TrackerSmsTexts_TrackerTransactions_TransactionId FOREIGN KEY (TransactionId) REFERENCES TrackerTransactions (Id)
    );

    CREATE UNIQUE INDEX IX_TrackerSmsTexts_TransactionId ON TrackerSmsTexts (TransactionId);
END
GO
