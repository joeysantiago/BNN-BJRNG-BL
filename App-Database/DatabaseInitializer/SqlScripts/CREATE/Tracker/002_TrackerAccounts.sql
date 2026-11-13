-- The bank accounts, credit cards and loans of a SnapTracker user, found in the SMS. AccountType is bank, card or loan; Last4 the last digits the bank shows;
-- Provider the bank's name. A card keeps its latest statement (StatementTotalMinor in paise, StatementDueOn); a loan its EMI (EmiMinor in paise), by which
-- EMI debits are linked to it. Label is the user's own name for it. Transactions point here (AccountId, LoanId), so this table comes before them.
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TrackerAccounts')
BEGIN
    CREATE TABLE TrackerAccounts
    (
        Id                  INT IDENTITY(1,1) NOT NULL                                                                   ,
        TrackerUserId       INT               NOT NULL                                                                   ,
        AccountType         VARCHAR(10)       NOT NULL                                                                   ,
        Last4               VARCHAR(8)        NOT NULL                                                                   ,
        Provider            NVARCHAR(60)      NOT NULL                                                                   ,
        Label               NVARCHAR(60)      NULL                                                                       ,
        EmiMinor            BIGINT            NULL                                                                       ,
        StatementTotalMinor BIGINT            NULL                                                                       ,
        StatementDueOn      DATETIME2         NULL                                                                       ,
        IsActive            BIT               NOT NULL CONSTRAINT DF_TrackerAccounts_IsActive DEFAULT (1)                ,
        IsSoftDeleted       BIT               NOT NULL CONSTRAINT DF_TrackerAccounts_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted           BIT               NOT NULL CONSTRAINT DF_TrackerAccounts_IsDeleted DEFAULT (0)               ,
        CreatedBy           INT               NULL                                                                       ,
        CreatedOn           DATETIME2         NOT NULL CONSTRAINT DF_TrackerAccounts_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy          INT               NULL                                                                       ,
        ModifiedOn          DATETIME2         NULL                                                                       ,

        CONSTRAINT PK_TrackerAccounts PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_TrackerAccounts_TrackerUsers_TrackerUserId FOREIGN KEY (TrackerUserId) REFERENCES TrackerUsers (Id)
    );

    CREATE UNIQUE INDEX IX_TrackerAccounts_TrackerUserId_AccountType_Last4 ON TrackerAccounts (TrackerUserId, AccountType, Last4);
END
GO
