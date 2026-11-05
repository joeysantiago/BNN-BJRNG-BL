-- The WhatsApp Business (Meta Cloud API) account the site sends WhatsApp messages with: one row, edited by a super admin on Settings > General.
-- The access token is encrypted with ASP.NET Data Protection (AccessTokenProtected); the keys live outside the database.
-- TemplateName is an approved message template whose body has one variable ({{1}}), filled with the message text.
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'WhatsAppSettings')
BEGIN
    CREATE TABLE WhatsAppSettings
    (
        Id                   INT IDENTITY(1,1) NOT NULL                                                                    ,
        Enabled              BIT               NOT NULL CONSTRAINT DF_WhatsAppSettings_Enabled DEFAULT (0)                 ,
        PhoneNumberId        VARCHAR(40)       NOT NULL                                                                    ,
        BusinessAccountId    VARCHAR(40)       NULL                                                                        ,
        AccessTokenProtected NVARCHAR(2000)    NULL                                                                        ,
        ApiVersion           VARCHAR(10)       NOT NULL                                                                    ,
        TemplateName         VARCHAR(512)      NOT NULL                                                                    ,
        TemplateLanguage     VARCHAR(10)       NOT NULL                                                                    ,
        IsActive             BIT               NOT NULL CONSTRAINT DF_WhatsAppSettings_IsActive DEFAULT (1)                ,
        IsSoftDeleted        BIT               NOT NULL CONSTRAINT DF_WhatsAppSettings_IsSoftDeleted DEFAULT (0)           ,
        IsDeleted            BIT               NOT NULL CONSTRAINT DF_WhatsAppSettings_IsDeleted DEFAULT (0)               ,
        CreatedBy            INT               NULL                                                                        ,
        CreatedOn            DATETIME2         NOT NULL CONSTRAINT DF_WhatsAppSettings_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedBy           INT               NULL                                                                        ,
        ModifiedOn           DATETIME2         NULL                                                                        ,

        CONSTRAINT PK_WhatsAppSettings PRIMARY KEY CLUSTERED (Id)
    );
END
GO
