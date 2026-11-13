-- A transaction of SnapTracker: made from a bank or UPI SMS, or typed in by hand. AmountMinor is in paise (BIGINT minor units, App-Document/sql-int-id.md).
-- Status is pending, confirmed, auto, ignored or duplicate; ignored and duplicate rows are not counted in any total. CategoryCode and Method are codes
-- (Tracker:Categories in appsettings.json, and upi, debitCard, ...); the UI shows their names through translation keys. DuplicateOfId points at the original.
-- FlowCode is what the transaction counts towards (spend, cardSpend, emi, cardBillPaid, salary, income, refund, cardRefund, loanIn, selfTransfer,
-- cardPaymentIn); FlowEdited when the user chose it. PairId links the two sides of one movement; AccountId the bank account or card, LoanId the loan.
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TrackerTransactions')
BEGIN
    CREATE TABLE TrackerTransactions
    (
        Id              INT IDENTITY(1,1) NOT NULL                                                                       ,
        TrackerUserId   INT               NOT NULL                                                                       ,
        Source          VARCHAR(10)       NOT NULL                                                                       ,
        Type            VARCHAR(10)       NOT NULL                                                                       ,
        TypeGuessed     BIT               NOT NULL CONSTRAINT DF_TrackerTransactions_TypeGuessed DEFAULT (0)             ,
        AmountMinor     BIGINT            NOT NULL                                                                       ,
        CurrencyCode    CHAR(3)           NOT NULL                                                                       ,
        Merchant        NVARCHAR(60)      NULL                                                                           ,
        CategoryCode    VARCHAR(20)       NOT NULL                                                                       ,
        FlowCode        VARCHAR(16)       NOT NULL                                                                       ,
        FlowEdited      BIT               NOT NULL CONSTRAINT DF_TrackerTransactions_FlowEdited DEFAULT (0)              ,
        Kind            VARCHAR(20)       NULL                                                                           ,
        Method          VARCHAR(20)       NOT NULL                                                                       ,
        AccountLast4    VARCHAR(8)        NULL                                                                           ,
        Reference       VARCHAR(30)       NULL                                                                           ,
        OccurredOn      DATETIME2         NOT NULL                                                                       ,
        Confidence      INT               NOT NULL                                                                       ,
        Status          VARCHAR(12)       NOT NULL                                                                       ,
        Note            NVARCHAR(300)     NOT NULL                                                                       ,
        IsEdited        BIT               NOT NULL CONSTRAINT DF_TrackerTransactions_IsEdited DEFAULT (0)                ,
        DuplicateOfId   INT               NULL                                                                           ,
        DuplicateReason VARCHAR(12)       NULL                                                                           ,
        PairId          INT               NULL                                                                           ,
        AccountId       INT               NULL                                                                           ,
        LoanId          INT               NULL                                                                           ,
        IsActive        BIT               NOT NULL CONSTRAINT DF_TrackerTransactions_IsActive DEFAULT (1)                ,
        IsSoftDeleted   BIT               NOT NULL CONSTRAINT DF_TrackerTransactions_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted       BIT               NOT NULL CONSTRAINT DF_TrackerTransactions_IsDeleted DEFAULT (0)               ,
        CreatedBy       INT               NULL                                                                           ,
        CreatedOn       DATETIME2         NOT NULL CONSTRAINT DF_TrackerTransactions_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy      INT               NULL                                                                           ,
        ModifiedOn      DATETIME2         NULL                                                                           ,

        CONSTRAINT PK_TrackerTransactions PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_TrackerTransactions_TrackerUsers_TrackerUserId FOREIGN KEY (TrackerUserId) REFERENCES TrackerUsers (Id),
        CONSTRAINT FK_TrackerTransactions_TrackerTransactions_DuplicateOfId FOREIGN KEY (DuplicateOfId) REFERENCES TrackerTransactions (Id),
        CONSTRAINT FK_TrackerTransactions_TrackerTransactions_PairId FOREIGN KEY (PairId) REFERENCES TrackerTransactions (Id),
        CONSTRAINT FK_TrackerTransactions_TrackerAccounts_AccountId FOREIGN KEY (AccountId) REFERENCES TrackerAccounts (Id),
        CONSTRAINT FK_TrackerTransactions_TrackerAccounts_LoanId FOREIGN KEY (LoanId) REFERENCES TrackerAccounts (Id)
    );

    CREATE INDEX IX_TrackerTransactions_TrackerUserId_OccurredOn ON TrackerTransactions (TrackerUserId, OccurredOn);
    CREATE INDEX IX_TrackerTransactions_TrackerUserId_Reference ON TrackerTransactions (TrackerUserId, Reference);
END
GO
