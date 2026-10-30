IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KhataContacts')
BEGIN
    CREATE TABLE KhataContacts
    (
        Id                  INT IDENTITY(1,1) NOT NULL                                                                 ,
        BookId              INT               NOT NULL                                                                 ,
        OwnerUserId         INT               NOT NULL                                                                 ,
        Name                NVARCHAR(100)     NOT NULL                                                                 ,
        Mobile              VARCHAR(15)       NULL                                                                     ,
        Email               NVARCHAR(256)     NULL                                                                     ,
        Address             NVARCHAR(300)     NULL                                                                     ,
        Note                NVARCHAR(500)     NULL                                                                     ,
        ContactType         TINYINT           NOT NULL CONSTRAINT DF_KhataContacts_ContactType DEFAULT (1)             ,
        AllowContactEntries BIT               NOT NULL CONSTRAINT DF_KhataContacts_AllowContactEntries DEFAULT (0)     ,
        LinkedUserId        INT               NULL                                                                     ,
        ShareStatus         TINYINT           NOT NULL CONSTRAINT DF_KhataContacts_ShareStatus DEFAULT (0)             ,
        ShareRespondedOn    DATETIME2         NULL                                                                     ,
        BalanceMinor        BIGINT            NOT NULL CONSTRAINT DF_KhataContacts_BalanceMinor DEFAULT (0)            ,
        DueDate             DATE              NULL                                                                     ,
        LastReminderOn      DATETIME2         NULL                                                                     ,
        RowVersion          ROWVERSION        NOT NULL                                                                 ,
        IsActive            BIT               NOT NULL CONSTRAINT DF_KhataContacts_IsActive DEFAULT (1)                ,
        IsSoftDeleted       BIT               NOT NULL CONSTRAINT DF_KhataContacts_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted           BIT               NOT NULL CONSTRAINT DF_KhataContacts_IsDeleted DEFAULT (0)               ,
        CreatedBy           INT               NULL                                                                     ,
        CreatedOn           DATETIME2         NOT NULL CONSTRAINT DF_KhataContacts_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy          INT               NULL                                                                     ,
        ModifiedOn          DATETIME2         NULL                                                                     ,

        CONSTRAINT PK_KhataContacts PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_KhataContacts_KhataBooks_BookId FOREIGN KEY (BookId) REFERENCES KhataBooks (Id),
        CONSTRAINT FK_KhataContacts_KhataUsers_OwnerUserId FOREIGN KEY (OwnerUserId) REFERENCES KhataUsers (Id),
        CONSTRAINT FK_KhataContacts_KhataUsers_LinkedUserId FOREIGN KEY (LinkedUserId) REFERENCES KhataUsers (Id)
    );

    CREATE INDEX IX_KhataContacts_BookId_Name ON KhataContacts (BookId, Name);
    CREATE INDEX IX_KhataContacts_BookId_DueDate ON KhataContacts (BookId, DueDate);
    CREATE INDEX IX_KhataContacts_OwnerUserId ON KhataContacts (OwnerUserId);
    CREATE INDEX IX_KhataContacts_LinkedUserId_ShareStatus ON KhataContacts (LinkedUserId, ShareStatus);
    CREATE INDEX IX_KhataContacts_Mobile ON KhataContacts (Mobile);
    CREATE INDEX IX_KhataContacts_Email ON KhataContacts (Email);
END
GO
