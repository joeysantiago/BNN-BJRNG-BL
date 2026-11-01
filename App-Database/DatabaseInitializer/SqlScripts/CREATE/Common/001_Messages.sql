IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Messages')
BEGIN
    CREATE TABLE Messages
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                            ,
        Code          NVARCHAR(100)     NOT NULL                                                            ,
        Texts         NVARCHAR(MAX)     NOT NULL                                                            ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_Messages_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_Messages_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_Messages_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                                ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_Messages_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                                ,
        ModifiedOn    DATETIME2         NULL                                                                ,

        CONSTRAINT PK_Messages PRIMARY KEY CLUSTERED (Id),
        
    );

    CREATE UNIQUE INDEX IX_Messages_Code ON Messages (Code);
END
GO
