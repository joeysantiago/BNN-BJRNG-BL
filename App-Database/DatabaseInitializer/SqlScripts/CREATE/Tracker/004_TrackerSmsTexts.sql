-- The original SMS texts, kept apart so the user can delete the texts and keep the transactions. BodyProtected is encrypted with ASP.NET Data Protection
-- (TrackerSecretProtector) and never written to logs. Marks is a JSON list of the parts the reader used (amount, merchant, account, reference).
-- TransactionId is the transaction made from the text; a merchant's own "payment received" SMS (Tracker:MerchantSenders) has none: it confirms a bank's
-- transaction instead (TrackerTransactions.ConfirmedBySmsId), so every text also names its user.
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TrackerSmsTexts')
BEGIN
    CREATE TABLE TrackerSmsTexts
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                                   ,
        TrackerUserId INT               NOT NULL                                                                   ,
        TransactionId INT               NULL                                                                       ,
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
        CONSTRAINT FK_TrackerSmsTexts_TrackerUsers_TrackerUserId FOREIGN KEY (TrackerUserId) REFERENCES TrackerUsers (Id),
        CONSTRAINT FK_TrackerSmsTexts_TrackerTransactions_TransactionId FOREIGN KEY (TransactionId) REFERENCES TrackerTransactions (Id)
    );

    CREATE UNIQUE INDEX IX_TrackerSmsTexts_TransactionId ON TrackerSmsTexts (TransactionId) WHERE TransactionId IS NOT NULL;
    -- Every imported SMS is looked up by its hash (already imported, same text twice), so an import never scans the whole table.
    CREATE INDEX IX_TrackerSmsTexts_BodyHash ON TrackerSmsTexts (BodyHash) INCLUDE (ReceivedOn, TransactionId);
    -- The merchant texts still waiting for the bank's transaction they confirm are read on every reflow of the user.
    CREATE INDEX IX_TrackerSmsTexts_TrackerUserId_TransactionId ON TrackerSmsTexts (TrackerUserId, TransactionId);

    -- Circular reference: TrackerTransactions is created before TrackerSmsTexts, so this foreign key can only be added here.
    ALTER TABLE TrackerTransactions ADD CONSTRAINT FK_TrackerTransactions_TrackerSmsTexts_ConfirmedBySmsId FOREIGN KEY (ConfirmedBySmsId) REFERENCES TrackerSmsTexts (Id);
END
GO
