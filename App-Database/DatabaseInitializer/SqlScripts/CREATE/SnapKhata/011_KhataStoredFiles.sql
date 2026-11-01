IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KhataStoredFiles')
BEGIN
    CREATE TABLE KhataStoredFiles
    (
        Id                 INT IDENTITY(1,1) NOT NULL                                                                    ,
        UserId             INT               NOT NULL                                                                    ,
        BookId             INT               NULL                                                                        ,
        ContactId          INT               NULL                                                                        ,
        AttachmentId       INT               NULL                                                                        ,
        FileKind           TINYINT           NOT NULL                                                                    ,
        Role               TINYINT           NOT NULL CONSTRAINT DF_KhataStoredFiles_Role DEFAULT (1)                    ,
        Provider           TINYINT           NOT NULL                                                                    ,
        GoogleConnectionId INT               NULL                                                                        ,
        FileId             NVARCHAR(400)     NULL                                                                        ,
        FolderId           NVARCHAR(400)     NULL                                                                        ,
        SyncStatus         TINYINT           NOT NULL CONSTRAINT DF_KhataStoredFiles_SyncStatus DEFAULT (0)              ,
        SyncAttempts       INT               NOT NULL CONSTRAINT DF_KhataStoredFiles_SyncAttempts DEFAULT (0)            ,
        LastError          NVARCHAR(500)     NULL                                                                        ,
        IsActive           BIT               NOT NULL CONSTRAINT DF_KhataStoredFiles_IsActive DEFAULT (1)                ,
        IsSoftDeleted      BIT               NOT NULL CONSTRAINT DF_KhataStoredFiles_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted          BIT               NOT NULL CONSTRAINT DF_KhataStoredFiles_IsDeleted DEFAULT (0)               ,
        CreatedBy          INT               NULL                                                                        ,
        CreatedOn          DATETIME2         NOT NULL CONSTRAINT DF_KhataStoredFiles_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy         INT               NULL                                                                        ,
        ModifiedOn         DATETIME2         NULL                                                                        ,

        CONSTRAINT PK_KhataStoredFiles PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_KhataStoredFiles_KhataUsers_UserId FOREIGN KEY (UserId) REFERENCES KhataUsers (Id),
        CONSTRAINT FK_KhataStoredFiles_KhataBooks_BookId FOREIGN KEY (BookId) REFERENCES KhataBooks (Id),
        CONSTRAINT FK_KhataStoredFiles_KhataContacts_ContactId FOREIGN KEY (ContactId) REFERENCES KhataContacts (Id),
        CONSTRAINT FK_KhataStoredFiles_KhataAttachments_AttachmentId FOREIGN KEY (AttachmentId) REFERENCES KhataAttachments (Id),
        CONSTRAINT FK_KhataStoredFiles_KhataGoogleConnections_GoogleConnectionId FOREIGN KEY (GoogleConnectionId) REFERENCES KhataGoogleConnections (Id)
    );

    -- Circular reference: KhataUsers is created before KhataStoredFiles, so this foreign key can only be added here.
    ALTER TABLE KhataUsers ADD CONSTRAINT FK_KhataUsers_KhataStoredFiles_UpiQrStoredFileId FOREIGN KEY (UpiQrStoredFileId) REFERENCES KhataStoredFiles (Id);

    CREATE INDEX IX_KhataStoredFiles_SyncStatus ON KhataStoredFiles (SyncStatus);
    CREATE INDEX IX_KhataStoredFiles_UserId ON KhataStoredFiles (UserId);
END
GO
