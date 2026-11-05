using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Tasks;
using Thakurg.Contracts.Wrappers;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Services;

// The My Tasks settings of a user (they never touch SnapKhata). The name of the app is renamed on Settings > General like every app (SettingsService.RenameAsync).
public class TaskSettingsService : ITaskSettingsService
{
    private readonly IWhatsAppSender _sender;

    private readonly ITaskLimitsService _limits;

    private readonly IMessageService _messageService;

    private readonly ITaskRepository _taskRepository;

    private readonly ITaskUserRepository _userRepository;

    private readonly IUserProfileRepository _profileRepository;

    private static readonly string[] WeekStarts = ["mon", "sun"];

    private static readonly int[] LockMinutes = [0, 1, 5, 15, 30];

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
