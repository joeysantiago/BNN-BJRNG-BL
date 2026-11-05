IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'States')
BEGIN
    CREATE TABLE States
    (
        Id            INT IDENTITY(1,1) NOT NULL                                                          ,
        CountryId     INT               NOT NULL                                                          ,
        Code          NVARCHAR(10)      NOT NULL                                                          ,
        Name          NVARCHAR(100)     NOT NULL                                                          ,
        SortOrder     INT               NOT NULL                                                          ,
        IsActive      BIT               NOT NULL CONSTRAINT DF_States_IsActive DEFAULT (1)                ,
        IsSoftDeleted BIT               NOT NULL CONSTRAINT DF_States_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted     BIT               NOT NULL CONSTRAINT DF_States_IsDeleted DEFAULT (0)               ,
        CreatedBy     INT               NULL                                                              ,
        CreatedOn     DATETIME2         NOT NULL CONSTRAINT DF_States_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy    INT               NULL                                                              ,
        ModifiedOn    DATETIME2         NULL                                                              ,

        CONSTRAINT PK_States PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_States_Countries_CountryId FOREIGN KEY (CountryId) REFERENCES Countries (Id)
    );

    CREATE UNIQUE INDEX IX_States_CountryId_Code ON States (CountryId, Code);
END
GO
