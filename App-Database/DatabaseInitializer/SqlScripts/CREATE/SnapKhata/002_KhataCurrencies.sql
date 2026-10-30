IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KhataCurrencies')
BEGIN
    CREATE TABLE KhataCurrencies
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                                   ,
        OwnerUserId   INT               NULL                                                                       ,
        Code          NVARCHAR(10)      NOT NULL                                                                   ,
        Symbol        NVARCHAR(10)      NOT NULL                                                                   ,
        Name          NVARCHAR(50)      NOT NULL                                                                   ,
        Decimals      TINYINT           NOT NULL CONSTRAINT DF_KhataCurrencies_Decimals DEFAULT (2)                ,
        IsIso         BIT               NOT NULL CONSTRAINT DF_KhataCurrencies_IsIso DEFAULT (0)                   ,
        SortOrder     INT               NOT NULL CONSTRAINT DF_KhataCurrencies_SortOrder DEFAULT (0)               ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_KhataCurrencies_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_KhataCurrencies_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_KhataCurrencies_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                                       ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_KhataCurrencies_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                                       ,
        ModifiedOn    DATETIME2         NULL                                                                       ,

        CONSTRAINT PK_KhataCurrencies PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_KhataCurrencies_KhataUsers_OwnerUserId FOREIGN KEY (OwnerUserId) REFERENCES KhataUsers (Id),
        CONSTRAINT CK_KhataCurrencies_Decimals CHECK (Decimals <= 3)
    );

    CREATE UNIQUE INDEX IX_KhataCurrencies_OwnerUserId_Code ON KhataCurrencies (OwnerUserId, Code);
END
GO
