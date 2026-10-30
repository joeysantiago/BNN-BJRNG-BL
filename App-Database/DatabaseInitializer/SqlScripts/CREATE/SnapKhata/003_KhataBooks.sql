IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KhataBooks')
BEGIN
    CREATE TABLE KhataBooks
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                              ,
        OwnerUserId   INT               NOT NULL                                                              ,
        Name          NVARCHAR(100)     NOT NULL                                                              ,
        CurrencyId    INT               NOT NULL                                                              ,
        SortOrder     INT               NOT NULL CONSTRAINT DF_KhataBooks_SortOrder DEFAULT (0)               ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_KhataBooks_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_KhataBooks_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_KhataBooks_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                                  ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_KhataBooks_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                                  ,
        ModifiedOn    DATETIME2         NULL                                                                  ,

        CONSTRAINT PK_KhataBooks PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_KhataBooks_KhataUsers_OwnerUserId FOREIGN KEY (OwnerUserId) REFERENCES KhataUsers (Id),
        CONSTRAINT FK_KhataBooks_KhataCurrencies_CurrencyId FOREIGN KEY (CurrencyId) REFERENCES KhataCurrencies (Id)
    );

    -- Circular reference: KhataUsers is created before KhataBooks, so this foreign key can only be added here.
    ALTER TABLE KhataUsers ADD CONSTRAINT FK_KhataUsers_KhataBooks_LastBookId FOREIGN KEY (LastBookId) REFERENCES KhataBooks (Id);

    CREATE UNIQUE INDEX IX_KhataBooks_OwnerUserId_Name ON KhataBooks (OwnerUserId, Name) WHERE IsDeleted = 0 AND IsSoftDeleted = 0;
END
GO
