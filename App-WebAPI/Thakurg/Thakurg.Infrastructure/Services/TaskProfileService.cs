using Microsoft.Extensions.Options;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Application.Storage;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Tasks;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Services;

// The My Tasks profile (TaskUsers) of a common account. The first call makes it, with the settings and categories of Tasks:NewUser.
public class TaskProfileService : ITaskProfileService
{
    private readonly ITaskFileStore _fileStore;

    private readonly TasksNewUserOptions _newUser;

    private readonly IAuthSessionCache _sessionCache;

    private readonly IMessageService _messageService;

    private readonly ITaskUserRepository _userRepository;

    public TaskProfileService(IOptions<TasksOptions> options, ITaskUserRepository userRepository, ITaskFileStore fileStore, IAuthSessionCache sessionCache, IMessageService messageService)
    {
        _fileStore = fileStore;
        _sessionCache = sessionCache;
        _messageService = messageService;
        _newUser = options.Value.NewUser;
        _userRepository = userRepository;
    }

    #region Public Methods

    public async Task<int> ResolveAsync(int accountUserId, CancellationToken cancellationToken)
    {
        var existing = await _userRepository.FindByAccountAsync(accountUserId, cancellationToken);

        if (existing is not null)
            return existing.Id;

        var user = new TaskUser
        {
            UserId = accountUserId,
            CreatedBy = accountUserId,
            LockAfterMinutes = _newUser.LockAfterMinutes,
            NotificationsEnabled = _newUser.NotificationsEnabled,
            ReminderTime = _newUser.ReminderTime,
            RemindBefore = _newUser.RemindBefore,
            OverdueReminders = _newUser.OverdueReminders,
            UpcomingReminders = _newUser.UpcomingReminders,
            WeekStart = _newUser.WeekStart,
            DefaultTab = _newUser.DefaultTab,
            DefaultPriority = _newUser.DefaultPriority,
            WhatsAppReminders = _newUser.WhatsAppReminders,
            TimeZone = _newUser.TimeZone
        };
        var categories = _newUser.Categories.Select((c, i) => new TaskCategory { Code = c.Code, Name = c.Name, Color = c.Color, IsSystem = c.IsSystem, SortOrder = i, CreatedBy = accountUserId }).ToList();

        if (await _userRepository.TryAddAsync(user, categories, _newUser.DefaultCategoryCode, cancellationToken))
            return user.Id;

        return (await _userRepository.FindByAccountAsync(accountUserId, cancellationToken))!.Id;
    }

    // "Delete my account" of My Tasks: every task, picture and setting of the caller in this app, and their access to it. The common account and the other apps stay.
    public async Task<string> DeleteAsync(TaskCallerDto caller, CancellationToken cancellationToken)
    {
        var files = await _userRepository.DeleteAllAsync(caller.UserId, caller.AccountUserId, AppCodes.Tasks, cancellationToken);

        foreach (var file in files)
            await _fileStore.DeleteAsync(file);

        _sessionCache.Forget(caller.AccountUserId);

        return await _messageService.GetAsync(MessageCodes.TasksAccountDeleted);
    }

    #endregion
}
