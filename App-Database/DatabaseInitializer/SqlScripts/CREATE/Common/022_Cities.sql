IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Cities')
BEGIN
    CREATE TABLE Cities
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                          ,
        StateId       INT               NOT NULL                                                          ,
        Name          NVARCHAR(100)     NOT NULL                                                          ,
        SortOrder     INT               NOT NULL                                                          ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_Cities_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_Cities_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_Cities_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                              ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_Cities_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                              ,
        ModifiedOn    DATETIME2         NULL                                                              ,

        CONSTRAINT PK_Cities PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_Cities_States_StateId FOREIGN KEY (StateId) REFERENCES States (Id)
    );

    CREATE UNIQUE INDEX IX_Cities_StateId_Name ON Cities (StateId, Name);
END
GO
