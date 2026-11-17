using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Tasks;
using Thakurg.Contracts.Wrappers;
using Thakurg.Domain.Entities;
using Thakurg.Infrastructure.Common;

namespace Thakurg.Infrastructure.Services;

// Sharing a task with another account. Rules:
// - Only the owner shares, with an existing account (by its e-mail or the mobile number of its profile) that may open Tasks, never with themselves.
// - The person accepts or declines first; an accepted task shows in their Shared with me tab. Read lets them open it, edit also lets them change it (TaskService).
// - Sharing again with the same person changes the permission; after a decline or a removal it asks them again. Either side can end the share.
public class TaskShareService : ITaskShareService
{
    private readonly IMessageService _messageService;

    private readonly ITaskRepository _taskRepository;

    private readonly ITaskShareRepository _shareRepository;

    public TaskShareService(ITaskRepository taskRepository, ITaskShareRepository shareRepository, IMessageService messageService)
    {
        _taskRepository = taskRepository;
        _shareRepository = shareRepository;
        _messageService = messageService;
    }

    #region Public Methods

    public async Task<List<TaskSharedDto>> GetIncomingAsync(TaskCallerDto caller, CancellationToken cancellationToken)
    {
        return (await _shareRepository.GetIncomingAsync(caller.AccountUserId, cancellationToken)).Select(r => TaskMapper.ToDto(r.Share, r.Task, r.OwnerName)).ToList();
    }

    public async Task<List<TaskShareDto>> GetSharesAsync(TaskCallerDto caller, int taskId, CancellationToken cancellationToken)
    {
        var task = await RequireOwnTaskAsync(caller, taskId, cancellationToken);

        return (await _shareRepository.GetSharesAsync(task.Id, cancellationToken)).Select(r => TaskMapper.ToDto(r.Share, r.Name)).ToList();
    }

    // The owner stops sharing, or the person the task is shared with removes it from their list.
    public async Task<ServiceResultDto<int>> RemoveAsync(TaskCallerDto caller, int shareId, CancellationToken cancellationToken)
    {
        var owned = await _shareRepository.GetOwnedAsync(shareId, caller.UserId, cancellationToken);
        var share = owned ?? await _shareRepository.GetAsync(shareId, caller.AccountUserId, cancellationToken) ?? throw new BusinessException(MessageCodes.TasksShareNotFound, 404);
        share.IsSoftDeleted = true;
        Touch(share, caller);
        await _shareRepository.SaveChangesAsync(cancellationToken);

        return new ServiceResultDto<int> { Data = share.Id, Message = await _messageService.GetAsync(owned is null ? MessageCodes.TasksShareLeft : MessageCodes.TasksShareRemoved) };
    }

    public async Task<ServiceResultDto<int>> DeclineAsync(TaskCallerDto caller, int shareId, CancellationToken cancellationToken)
    {
        var share = await RequirePendingAsync(caller, shareId, cancellationToken);
        share.Status = TaskShareStatuses.Declined;
        share.RespondedOn = DateTime.UtcNow;
        Touch(share, caller);
        await _shareRepository.SaveChangesAsync(cancellationToken);

        return new ServiceResultDto<int> { Data = share.Id, Message = await _messageService.GetAsync(MessageCodes.TasksShareDeclined) };
    }

    public async Task<ServiceResultDto<TaskSharedDto>> AcceptAsync(TaskCallerDto caller, int shareId, CancellationToken cancellationToken)
    {
        var share = await RequirePendingAsync(caller, shareId, cancellationToken);
        share.Status = TaskShareStatuses.Accepted;
        share.RespondedOn = DateTime.UtcNow;
        Touch(share, caller);
        await _shareRepository.SaveChangesAsync(cancellationToken);
        var incoming = (await _shareRepository.GetIncomingAsync(caller.AccountUserId, cancellationToken)).FirstOrDefault(r => r.Share.Id == share.Id);

        if (incoming.Share is null)
            throw new BusinessException(MessageCodes.TasksShareNotFound, 404);

        return new ServiceResultDto<TaskSharedDto> { Data = TaskMapper.ToDto(incoming.Share, incoming.Task, incoming.OwnerName), Message = await _messageService.GetAsync(MessageCodes.TasksShareAccepted) };
    }

    public async Task<ServiceResultDto<TaskShareDto>> ShareAsync(TaskCallerDto caller, int taskId, TaskShareRequestDto request, CancellationToken cancellationToken)
    {
        var task = await RequireOwnTaskAsync(caller, taskId, cancellationToken);

        if (!TaskSharePermissions.All.Contains(request.Permission))
            throw new BusinessException(MessageCodes.TasksInvalid, 400);

        var to = request.To.Trim();
        var email = to.Contains('@') ? EmailAddress.Normalize(to) : null;
        var mobile = email is null ? PhoneNumber.Normalize(to) : null;
        var sharedWith = email ?? mobile ?? throw new BusinessException(MessageCodes.TasksShareTargetInvalid, 400);
        var account = await _shareRepository.FindAccountAsync(email, mobile, cancellationToken) ?? throw new BusinessException(MessageCodes.TasksShareNoAccount, 404);

        if (account.Id == caller.AccountUserId)
            throw new BusinessException(MessageCodes.TasksShareSelf, 400);

        if (!await _shareRepository.HasTasksAppAsync(account.Id, cancellationToken))
            throw new BusinessException(MessageCodes.TasksShareNoApp, 400);

        var share = await _shareRepository.GetByTaskAsync(task.Id, account.Id, cancellationToken);
        var ask = share is null || share.IsSoftDeleted || share.Status == TaskShareStatuses.Declined;
        share ??= new TaskShare { TaskId = task.Id, UserId = account.Id, CreatedBy = caller.AccountUserId };
        share.Permission = request.Permission;
        share.SharedWith = sharedWith;

        if (ask)
        {
            share.Status = TaskShareStatuses.Pending;
            share.RespondedOn = null;
            share.IsSoftDeleted = false;
        }

        Touch(share, caller);

        if (share.Id == 0)
            await _shareRepository.AddAsync(share, cancellationToken);
        else
            await _shareRepository.SaveChangesAsync(cancellationToken);

        await _taskRepository.AddHistoryAsync([new TaskHistory { TaskId = task.Id, Action = TaskHistoryActions.Shared, Detail = sharedWith, CreatedBy = caller.AccountUserId }], cancellationToken);

        return new ServiceResultDto<TaskShareDto> { Data = TaskMapper.ToDto(share, account.DisplayName), Message = await _messageService.GetAsync(MessageCodes.TasksShared, sharedWith) };
    }

    #endregion

    #region Private Methods

    private static void Touch(TaskShare share, TaskCallerDto caller)
    {
        share.ModifiedBy = caller.AccountUserId;
        share.ModifiedOn = DateTime.UtcNow;
    }

    private async Task<TaskItem> RequireOwnTaskAsync(TaskCallerDto caller, int taskId, CancellationToken cancellationToken)
    {
        return await _taskRepository.GetTaskAsync(caller.UserId, taskId, cancellationToken) ?? throw new BusinessException(MessageCodes.TasksNotFound, 404);
    }

    private async Task<TaskShare> RequirePendingAsync(TaskCallerDto caller, int shareId, CancellationToken cancellationToken)
    {
        var share = await _shareRepository.GetAsync(shareId, caller.AccountUserId, cancellationToken);

        return share is { IsSoftDeleted: false, Status: TaskShareStatuses.Pending } ? share : throw new BusinessException(MessageCodes.TasksShareNotFound, 404);
    }

    #endregion
}
