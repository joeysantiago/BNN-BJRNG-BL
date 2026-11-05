using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Infrastructure.Common;
using Thakurg.Infrastructure.Email;
using Thakurg.Infrastructure.Export;
using Thakurg.Infrastructure.Notifications;
using Thakurg.Infrastructure.Persistence;
using Thakurg.Infrastructure.Repositories;
using Thakurg.Infrastructure.Services;

namespace Thakurg.Infrastructure;

public static partial class DependencyInjection
{
    #region Public Methods

    // A paused Azure SQL database (free offer) answers with a transient error while it wakes up, so failed calls are retried instead of failing.
    // Code that opens its own transaction must run it through Database.CreateExecutionStrategy().
    public static IServiceCollection AddCommonDbContext(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<CommonDbContext>(options => options.UseSqlServer(connectionString, sql => sql.EnableRetryOnFailure()));
        services.AddScoped<ICommonDbContext>(provider => provider.GetRequiredService<CommonDbContext>());

        return services;
    }

    // Shared services (messages, translations, settings, the common login), then each feature from its own file (DependencyInjection.<Feature>.cs).
    // A branch without a feature's file still builds: the call to it is dropped.
    public static IServiceCollection AddThakurgServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<HostingOptions>().Bind(configuration.GetSection(HostingOptions.SectionName)).Validate(o => o.HostedOn is HostingOptions.Local or HostingOptions.Azure, "Hosting:HostedOn must be Local or Azure.").ValidateOnStart();
        services.Configure<StreamingOptions>(configuration.GetSection(StreamingOptions.SectionName));
        services.AddOptions<AvatarOptions>().Bind(configuration.GetSection(AvatarOptions.SectionName)).Validate(o => o.Root.Length > 0 && o.MaxBytes > 0 && o.Extensions.Count > 0, "Avatars:Root, Avatars:MaxBytes and Avatars:Extensions must be set.").ValidateOnStart();
        services.AddOptions<ExportOptions>().Bind(configuration.GetSection(ExportOptions.SectionName)).Validate(o => o is { PdfMargin: >= 0, PdfFontSize: > 0, PdfTitleFontSize: > 0, PdfCellPadding: >= 0, PdfLineWidth: >= 0, SheetNameLength: > 0 }, "Every Export value must be set (sizes above 0).").ValidateOnStart();
        services.AddOptions<ProfileOptions>().Bind(configuration.GetSection(ProfileOptions.SectionName)).Validate(o => o.Limits is { AddressLength: > 0, CityLength: > 0, StateLength: > 0, PostalCodeLength: > 0, CountryLength: > 0, MobileLength: > 0, CompanyNameLength: > 0, CompanyTaxIdLength: > 0, CompanyEmailLength: > 0, CompanyPhoneLength: > 0, CompanyAddressLength: > 0 }, "Every Profile:Limits value must be above 0.").ValidateOnStart();
        services.AddOptions<SiteOptions>().Bind(configuration.GetSection(SiteOptions.SectionName)).Validate(o => Uri.TryCreate(o.PublicUrl, UriKind.Absolute, out _), "Site:PublicUrl must be the web site's absolute address.").ValidateOnStart();
        services.AddOptions<AppManifestOptions>().Bind(configuration.GetSection(AppManifestOptions.SectionName)).Validate(o => o.CacheSeconds > 0 && o.Apps.Values.All(IsValidManifest), "AppManifests:CacheSeconds must be above 0, and every app under AppManifests:Apps needs Id, StartUrl, Scope, Display, Orientation, BackgroundColor, ThemeColor and Icons.").ValidateOnStart();
        services.AddOptions<EmailOptions>().Bind(configuration.GetSection(EmailOptions.SectionName)).Validate(o => o.Smtp.Port > 0 && o.Smtp.FromAddress.Length > 0 && o.Smtp.FromName.Length > 0, "Email:Smtp:Port, FromAddress and FromName must be set (an empty Host means mail is off).").ValidateOnStart();

        services.AddMemoryCache();
        services.AddDataProtection().SetApplicationName("thakurg");
        services.AddHttpContextAccessor();
        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddSingleton<IAuthTokenService, AuthTokenService>();
        services.AddSingleton<IMailSecretProtector, MailSecretProtector>();
        services.AddSingleton<IWhatsAppSecretProtector, WhatsAppSecretProtector>();

        services.AddScoped<IOtpRepository, OtpRepository>();
        services.AddScoped<IAuthRepository, AuthRepository>();
        services.AddScoped<IUserProfileRepository, UserProfileRepository>();
        services.AddScoped<IRoleRepository, RoleRepository>();
        services.AddScoped<IMessageRepository, MessageRepository>();
        services.AddScoped<ISettingsRepository, SettingsRepository>();
        services.AddScoped<IUserAccessRepository, UserAccessRepository>();
        services.AddScoped<IMailSettingRepository, MailSettingRepository>();
        services.AddScoped<IWhatsAppSettingRepository, WhatsAppSettingRepository>();
        services.AddScoped<ITranslationRepository, TranslationRepository>();

        services.AddScoped<IOtpService, OtpService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IExportService, ExportService>();
        services.AddScoped<IEmailSender, SmtpEmailSender>();
        services.AddScoped<IUserProfileService, UserProfileService>();
        services.AddScoped<IAvatarService, AvatarService>();
        services.AddScoped<IRoleService, RoleService>();
        services.AddScoped<IMessageService, MessageService>();
        services.AddScoped<ISettingsService, SettingsService>();
        services.AddScoped<IAppManifestService, AppManifestService>();
        services.AddScoped<IAuthSessionCache, AuthSessionCache>();
        services.AddScoped<IAccountMailService, AccountMailService>();
        services.AddScoped<IAuthSessionServices, AuthSessionServices>();
        services.AddScoped<IUserAccessService, UserAccessService>();
        services.AddScoped<IMailSettingService, MailSettingService>();
        services.AddScoped<IWhatsAppSettingService, WhatsAppSettingService>();
        services.AddScoped<ITranslationService, TranslationService>();
        services.AddScoped<IRolePermissionService, RolePermissionService>();

        AddSmsSender(services, configuration);
        AddWhatsAppSender(services, configuration);
        AddSpeedTestFeature(services, configuration);
        AddMusicFeature(services, configuration);
        AddYoutubeFeature(services, configuration);
        AddKhataFeature(services, configuration);

        return services;
    }

    #endregion

    #region Private Methods

    private static bool IsValidManifest(AppManifestAppOptions manifest)
    {
        return manifest is { Id.Length: > 0, StartUrl.Length: > 0, Scope.Length: > 0, Display.Length: > 0, Orientation.Length: > 0, BackgroundColor.Length: > 0, ThemeColor.Length: > 0, Icons.Count: > 0 };
    }

    // Sms:Provider picks the text-message sender. Only "None" exists yet (every send fails with SmsNotConfigured); a provider such as MSG91 or Twilio is
    // another ISmsSender with its own options section, registered here under its name.
    private static void AddSmsSender(IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<SmsOptions>().Bind(configuration.GetSection(SmsOptions.SectionName)).Validate(o => o.Provider == SmsOptions.None, "Sms:Provider must be None: no SMS provider is built in yet.").ValidateOnStart();
        services.AddScoped<ISmsSender, NotConfiguredSmsSender>();
    }

    // WhatsApp:Provider picks the WhatsApp sender: "None" (every send fails with WhatsAppNotConfigured) or "Meta" (the Meta WhatsApp Cloud API at WhatsApp:BaseUrl,
    // with the account, token and template of the WhatsAppSettings table, edited on Settings > General).
    private static void AddWhatsAppSender(IServiceCollection services, IConfiguration configuration)
    {
        var options = configuration.GetSection(WhatsAppOptions.SectionName).Get<WhatsAppOptions>() ?? throw new InvalidOperationException("The WhatsApp section is missing from appsettings.json.");
        services.AddOptions<WhatsAppOptions>().Bind(configuration.GetSection(WhatsAppOptions.SectionName)).Validate(o => o.Provider == WhatsAppOptions.None || (o.Provider == WhatsAppOptions.Meta && Uri.TryCreate(o.BaseUrl, UriKind.Absolute, out _) && o.TimeoutSeconds > 0), "WhatsApp:Provider must be None or Meta; Meta needs WhatsApp:BaseUrl and WhatsApp:TimeoutSeconds.").ValidateOnStart();

        if (options.Provider == WhatsAppOptions.Meta)
            services.AddHttpClient<IWhatsAppSender, MetaWhatsAppSender>(client => { client.BaseAddress = new Uri(options.BaseUrl); client.Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds); });
        else
            services.AddScoped<IWhatsAppSender, NotConfiguredWhatsAppSender>();
    }

    static partial void AddKhataFeature(IServiceCollection services, IConfiguration configuration);

    static partial void AddMusicFeature(IServiceCollection services, IConfiguration configuration);

    static partial void AddYoutubeFeature(IServiceCollection services, IConfiguration configuration);

    static partial void AddSpeedTestFeature(IServiceCollection services, IConfiguration configuration);

    #endregion
}
