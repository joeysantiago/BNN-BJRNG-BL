using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Tasks;
using Thakurg.Contracts.Wrappers;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Services;

// The My Tasks settings of a user (they never touch SnapKhata), and the name of the app: the "tasks" rows of PageNames, which only a super admin may change.
public class TaskSettingsService : ITaskSettingsService
{
    private const int NameLength = 40;

    private readonly IWhatsAppSender _sender;

    private readonly ITaskLimitsService _limits;

    private readonly IMessageService _messageService;

    private readonly ITaskRepository _taskRepository;

    private readonly ITaskUserRepository _userRepository;

    private readonly IUserProfileRepository _profileRepository;

    private static readonly string[] WeekStarts = ["mon", "sun"];

    private static readonly int[] LockMinutes = [0, 1, 5, 15, 30];

    private static readonly string[] Languages = ["en", "hi", "ar"];

    private static readonly string[] Tabs = ["all", "active", "completed"];

    private static readonly string[] RemindBefores = ["0", "15m", "1h", "1d"];

    public TaskSettingsService(ITaskUserRepository userRepository, ITaskRepository taskRepository, ITaskLimitsService limits, IUserProfileRepository profileRepository, IWhatsAppSender sender, IMessageService messageService)
    {
        _profileRepository = profileRepository;
        _sender = sender;
        _limits = limits;
        _userRepository = userRepository;
        _taskRepository = taskRepository;
        _messageService = messageService;
    }

    #region Public Methods

    public async Task<TaskSettingsDto> GetAsync(TaskCallerDto caller, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetAsync(caller.UserId, cancellationToken) ?? throw new BusinessException(MessageCodes.AuthSessionInvalid, 401);

        return ToDto(user, caller, await _limits.GetAsync(cancellationToken), await MobileAsync(caller, cancellationToken));
    }

    // A WhatsApp message to the mobile number of the profile, to check that reminders arrive.
    public async Task<string> TestWhatsAppAsync(TaskCallerDto caller, CancellationToken cancellationToken)
    {
        var mobile = await MobileAsync(caller, cancellationToken) ?? throw new BusinessException(MessageCodes.TasksWhatsAppNoMobile, 400);
        var names = await _userRepository.GetPageNamesAsync(AppCodes.Tasks, cancellationToken);
        var app = names.FirstOrDefault(n => n.LanguageCode == _messageService.CurrentLanguage())?.Name ?? names.FirstOrDefault(n => n.LanguageCode == "en")?.Name ?? AppCodes.Tasks;
        await _sender.SendAsync(mobile, await _messageService.GetAsync(MessageCodes.TasksWhatsAppTest, app), cancellationToken);

        return await _messageService.GetAsync(MessageCodes.TasksWhatsAppTestSent, mobile);
    }

    public async Task<ServiceResultDto<TaskSettingsDto>> SaveAsync(TaskCallerDto caller, TaskSettingsRequestDto request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetAsync(caller.UserId, cancellationToken) ?? throw new BusinessException(MessageCodes.AuthSessionInvalid, 401);
        var valid = LockMinutes.Contains(request.LockAfterMinutes) && WeekStarts.Contains(request.WeekStart) && Tabs.Contains(request.DefaultTab) && RemindBefores.Contains(request.RemindBefore) && request.DefaultPriority is >= 1 and <= 3 && TimeOnly.TryParseExact(request.ReminderTime, "HH:mm", out _) && TimeZoneInfo.TryFindSystemTimeZoneById(request.TimeZone, out _);

        if (!valid)
            throw new BusinessException(MessageCodes.TasksInvalid, 400);

        if (request.DefaultCategoryId is { } categoryId && await _taskRepository.GetCategoryAsync(caller.UserId, categoryId, cancellationToken) is null)
            throw new BusinessException(MessageCodes.TasksCategoryNotFound, 404);

        user.LockAfterMinutes = request.LockAfterMinutes;
        user.NotificationsEnabled = request.NotificationsEnabled;
        user.ReminderTime = request.ReminderTime;
        user.RemindBefore = request.RemindBefore;
        user.OverdueReminders = request.OverdueReminders;
        user.UpcomingReminders = request.UpcomingReminders;
        user.WeekStart = request.WeekStart;
        user.DefaultTab = request.DefaultTab;
        user.DefaultPriority = request.DefaultPriority;
        user.DefaultCategoryId = request.DefaultCategoryId;
        user.WhatsAppReminders = request.WhatsAppReminders;
        user.TimeZone = request.TimeZone;
        user.ModifiedBy = caller.AccountUserId;
        user.ModifiedOn = DateTime.UtcNow;
        await _userRepository.SaveChangesAsync(cancellationToken);

        return new ServiceResultDto<TaskSettingsDto> { Data = ToDto(user, caller, await _limits.GetAsync(cancellationToken), await MobileAsync(caller, cancellationToken)), Message = await _messageService.GetAsync(MessageCodes.TasksSettingsSaved) };
    }

    // English is required; a Hindi or Arabic name left empty keeps the one it has.
    public async Task<ServiceResultDto<Dictionary<string, string>>> RenameAsync(TaskCallerDto caller, TaskAppNameRequestDto request, CancellationToken cancellationToken)
    {
        if (!caller.IsSuperAdmin)
            throw new BusinessException(MessageCodes.AuthForbidden, 403);

        var names = request.Names.Where(n => !string.IsNullOrWhiteSpace(n.Value)).ToDictionary(n => n.Key, n => n.Value.Trim());

        if (!names.ContainsKey("en") || names.Keys.Any(k => !Languages.Contains(k)) || names.Values.Any(v => v.Length > NameLength))
            throw new BusinessException(MessageCodes.TasksNameInvalid, 400, NameLength);

        var rows = await _userRepository.GetPageNamesAsync(AppCodes.Tasks, cancellationToken);
        var now = DateTime.UtcNow;

        foreach (var row in rows.Where(r => names.ContainsKey(r.LanguageCode)))
        {
            row.Name = names[row.LanguageCode];
            row.ModifiedBy = caller.AccountUserId;
            row.ModifiedOn = now;
        }

        var added = names.Where(n => rows.All(r => r.LanguageCode != n.Key)).Select(n => new PageName { PageCode = AppCodes.Tasks, LanguageCode = n.Key, Name = n.Value, CreatedBy = caller.AccountUserId });
        await _userRepository.AddPageNamesAsync(added, cancellationToken);
        var saved = (await _userRepository.GetPageNamesAsync(AppCodes.Tasks, cancellationToken)).ToDictionary(r => r.LanguageCode, r => r.Name);

        return new ServiceResultDto<Dictionary<string, string>> { Data = saved, Message = await _messageService.GetAsync(MessageCodes.TasksNameSaved) };
    }

    #endregion

    #region Private Methods

    private async Task<string?> MobileAsync(TaskCallerDto caller, CancellationToken cancellationToken)
    {
        return (await _profileRepository.GetByUserAsync(caller.AccountUserId, cancellationToken))?.Mobile;
    }

    private static TaskSettingsDto ToDto(TaskUser user, TaskCallerDto caller, TaskLimitsDto limits, string? mobile)
    {
        return new TaskSettingsDto
        {
            CanRename = caller.IsSuperAdmin,
            Limits = limits,
            Mobile = mobile,
            WhatsAppReminders = user.WhatsAppReminders,
            TimeZone = user.TimeZone,
            LockAfterMinutes = user.LockAfterMinutes,
            NotificationsEnabled = user.NotificationsEnabled,
            ReminderTime = user.ReminderTime,
            RemindBefore = user.RemindBefore,
            OverdueReminders = user.OverdueReminders,
            UpcomingReminders = user.UpcomingReminders,
            WeekStart = user.WeekStart,
            DefaultTab = user.DefaultTab,
            DefaultPriority = user.DefaultPriority,
            DefaultCategoryId = user.DefaultCategoryId
        };
    }

    #endregion
}
