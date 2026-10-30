IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KhataTransactions')
BEGIN
    CREATE TABLE KhataTransactions
    (
        Id                INT IDENTITY(1,1) NOT NULL                                                                     ,
        BookId            INT               NOT NULL                                                                     ,
        ContactId         INT               NOT NULL                                                                     ,
        EntryType         TINYINT           NOT NULL                                                                     ,
        AmountMinor       BIGINT            NOT NULL                                                                     ,
        Note              NVARCHAR(500)     NULL                                                                         ,
        EntryDate         DATE              NOT NULL                                                                     ,
        AddedByUserId     INT               NOT NULL                                                                     ,
        Version           INT               NOT NULL CONSTRAINT DF_KhataTransactions_Version DEFAULT (1)                 ,
        Source            TINYINT           NOT NULL CONSTRAINT DF_KhataTransactions_Source DEFAULT (1)                  ,
        ImportJobId       INT               NULL                                                                         ,
        ImportFingerprint CHAR(64)          NULL                                                                         ,
        RowVersion        ROWVERSION        NOT NULL                                                                     ,
        IsActive          BIT               NOT NULL CONSTRAINT DF_KhataTransactions_IsActive DEFAULT (1)                ,
        IsSoftDeleted     BIT               NOT NULL CONSTRAINT DF_KhataTransactions_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted         BIT               NOT NULL CONSTRAINT DF_KhataTransactions_IsDeleted DEFAULT (0)               ,
        CreatedBy         INT               NULL                                                                         ,
        CreatedOn         DATETIME2         NOT NULL CONSTRAINT DF_KhataTransactions_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy        INT               NULL                                                                         ,
        ModifiedOn        DATETIME2         NULL                                                                         ,

        CONSTRAINT PK_KhataTransactions PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_KhataTransactions_KhataBooks_BookId FOREIGN KEY (BookId) REFERENCES KhataBooks (Id),
        CONSTRAINT FK_KhataTransactions_KhataContacts_ContactId FOREIGN KEY (ContactId) REFERENCES KhataContacts (Id),
        CONSTRAINT FK_KhataTransactions_KhataUsers_AddedByUserId FOREIGN KEY (AddedByUserId) REFERENCES KhataUsers (Id),
        CONSTRAINT CK_KhataTransactions_AmountMinor CHECK (AmountMinor > 0),
        CONSTRAINT CK_KhataTransactions_EntryType CHECK (EntryType IN (1, 2))
    );

    CREATE INDEX IX_KhataTransactions_ContactId_EntryDate_CreatedOn ON KhataTransactions (ContactId, EntryDate, CreatedOn);
    CREATE INDEX IX_KhataTransactions_BookId_EntryDate ON KhataTransactions (BookId, EntryDate);
    CREATE UNIQUE INDEX IX_KhataTransactions_BookId_ImportFingerprint ON KhataTransactions (BookId, ImportFingerprint) WHERE ImportFingerprint IS NOT NULL;
END
GO
