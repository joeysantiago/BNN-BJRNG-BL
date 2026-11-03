using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Infrastructure.Common;
using Thakurg.Infrastructure.Notifications;
using Thakurg.Infrastructure.Repositories;
using Thakurg.Infrastructure.Security;
using Thakurg.Infrastructure.Services;

namespace Thakurg.Infrastructure;

public static partial class DependencyInjection
{
    // The key ring that encrypts the Azure Storage connection string; the same name on every instance, so all of them can read it.
    private const string DataProtectionName = "thakurg";

    #region Private Methods

    private static bool IsValidKhata(KhataOptions options)
    {
        return options.Limits is { MaxBooks: > 0, MaxCustomCurrencies: > 0, MaxContactsPerBook: > 0, MaxAmountMinor: > 0, PageSize: > 0, IdempotencyHours: > 0, MaxPhotosPerEntry: > 0, MaxPhotoBytes: > 0, SummaryMonths: > 0, SummaryTopContacts: > 0, SummaryRecent: > 0, MaxExportRows: > 0 } && options.Limits.MaxPageSize >= options.Limits.PageSize && options.LocalFiles.Root.Length > 0;
    }

    static partial void AddKhataFeature(IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<KhataOptions>().Bind(configuration.GetSection(KhataOptions.SectionName)).Validate(IsValidKhata, "Every Khata:Limits value must be above 0, Khata:Limits:MaxPageSize at least PageSize, and Khata:LocalFiles:Root must be set.").ValidateOnStart();

        services.AddDataProtection().SetApplicationName(DataProtectionName);
        services.AddHostedService<KhataNotificationWorker>();
        services.AddSingleton<IKhataSecretProtector, KhataSecretProtector>();
        services.AddSingleton<IKhataNotificationQueue, KhataNotificationQueue>();
        services.AddScoped<IRateLimitRejectionHandler, KhataRateLimitRejectionHandler>();

        services.AddScoped<IKhataBookRepository, KhataBookRepository>();
        services.AddScoped<IKhataUserRepository, KhataUserRepository>();
        services.AddScoped<IKhataContactRepository, KhataContactRepository>();
        services.AddScoped<IKhataAttachmentRepository, KhataAttachmentRepository>();
        services.AddScoped<IKhataStorageRepository, KhataStorageRepository>();
        services.AddScoped<IKhataIdempotencyRepository, KhataIdempotencyRepository>();
        services.AddScoped<IKhataNotificationRepository, KhataNotificationRepository>();
        services.AddScoped<IKhataTransactionRepository, KhataTransactionRepository>();

        services.AddScoped<IKhataFileStore, LocalKhataFileStore>();
        services.AddScoped<IKhataFileStore, AzureBlobKhataFileStore>();
        services.AddScoped<IKhataFileStorage, KhataFileStorage>();
        services.AddScoped<IKhataBookService, KhataBookService>();
        services.AddScoped<IKhataAuditService, KhataAuditService>();
        services.AddScoped<IKhataCommonServices, KhataCommonServices>();
        services.AddScoped<IKhataContactService, KhataContactService>();
        services.AddScoped<IKhataProfileService, KhataProfileService>();
        services.AddScoped<IKhataCurrencyService, KhataCurrencyService>();
        services.AddScoped<IKhataAttachmentService, KhataAttachmentService>();
        services.AddScoped<IKhataIdempotencyService, KhataIdempotencyService>();
        services.AddScoped<IKhataTransactionService, KhataTransactionService>();
        services.AddScoped<IKhataExportService, KhataExportService>();
        services.AddScoped<IKhataStorageService, KhataStorageService>();
        services.AddScoped<IKhataManifestService, KhataManifestService>();
        services.AddScoped<IKhataSettingsService, KhataSettingsService>();
        services.AddScoped<IKhataNotificationService, KhataNotificationService>();
    }

    #endregion
}
