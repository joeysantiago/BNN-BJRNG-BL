using System.Text.RegularExpressions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Tracker;
using Thakurg.Infrastructure.Common;
using Thakurg.Infrastructure.Repositories;
using Thakurg.Infrastructure.Services;

namespace Thakurg.Infrastructure;

// SnapTracker. Its settings (Tracker in appsettings.json) must all be there and valid, or the API does not start.
public static partial class DependencyInjection
{
    #region Private Methods

    private static bool IsPattern(string pattern)
    {
        try
        {
            _ = new Regex(pattern);

            return true;
        }
        catch (ArgumentException)
        {
            return false;
        }
    }

    private static bool IsValidTracker(TrackerOptions options)
    {
        var limits = options.Limits is { MaxAlerts: > 0, NoteLength: > 0, MaxSmsLength: > 0, MaxImportBatch: > 0, MaxAmountMinor: > 0, MerchantLength: > 0, DuplicateMinutes: > 0, MinAutoApprovePercent: > 0, PairHours: > 0, CardBillDays: > 0, EmiTolerancePercent: >= 0, UnnamedSelfMinor: > 0, OwnEntries: > 0, OwnNameLength: > 0 } && options.Limits.MaxAutoApprovePercent is > 0 and < 100 && options.Limits.MinAutoApprovePercent < options.Limits.MaxAutoApprovePercent;
        var newUser = TrackerApprovals.All.Contains(options.NewUser.ApprovalMode) && options.NewUser.AutoApprovePercent >= options.Limits.MinAutoApprovePercent && options.NewUser.AutoApprovePercent <= options.Limits.MaxAutoApprovePercent && options.NewUser.AlertTypes.All(TrackerAlertTypes.All.Contains);
        var lists = options.Categories.Contains("other") && options.Senders.Count > 0 && options.Merchants.All(m => m.Name.Length > 0 && options.Categories.Contains(m.Category) && IsPattern(m.Pattern));

        return limits && newUser && lists && options.CurrencyCode.Length == 3 && TimeZoneInfo.TryFindSystemTimeZoneById(options.TimeZone, out _);
    }

    static partial void AddTrackerFeature(IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<TrackerOptions>().Bind(configuration.GetSection(TrackerOptions.SectionName)).Validate(IsValidTracker, "Tracker:Limits, Tracker:NewUser, Tracker:Categories (with \"other\"), Tracker:Senders, Tracker:Merchants (valid patterns of known categories), Tracker:CurrencyCode and a known Tracker:TimeZone must be set.").ValidateOnStart();

        services.AddScoped<ITrackerRepository, TrackerRepository>();

        services.AddSingleton<ITrackerSmsReader, TrackerSmsReader>();
        services.AddScoped<ITrackerService, TrackerService>();
        services.AddScoped<ITrackerSmsServices, TrackerSmsServices>();
        services.AddScoped<ITrackerFlowService, TrackerFlowService>();
        services.AddScoped<ITrackerProfileService, TrackerProfileService>();
        services.AddScoped<ITrackerSecretProtector, TrackerSecretProtector>();
        services.AddScoped<ITrackerTransactionService, TrackerTransactionService>();
    }

    #endregion
}
