using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Application.Storage;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Tasks;
using Thakurg.Contracts.Wrappers;
using Thakurg.Domain.Entities;
using Thakurg.Infrastructure.Common;

namespace Thakurg.Infrastructure.Services;

// The tasks of one user. Rules:
// - When every checklist line is ticked the task completes by itself; unticking a line of a completed task reopens it. A task can also be completed or reopened by hand.
// - Completing a repeating task creates the next one once (due one interval later, checklist unticked, no pictures).
// - Delete is soft and can be undone (restore). Every change is written to the history of the task.
public class TaskService : ITaskService
{
    private const int ItemLength = 200;

    private const int TitleLength = 120;

    private const int DescriptionLength = 2000;

    private readonly ITaskFileStore _fileStore;

    private readonly ITaskLimitsService _limits;

    private readonly IMessageService _messageService;

    private readonly ITaskRepository _taskRepository;

    private static readonly string[] BulkActions = [TaskBulkActions.Delete, TaskBulkActions.Reopen, TaskBulkActions.Category, TaskBulkActions.Complete, TaskBulkActions.Duplicate];

    public TaskService(ITaskLimitsService limits, ITaskRepository taskRepository, ITaskFileStore fileStore, IMessageService messageService)
    {
        _limits = limits;
        _taskRepository = taskRepository;
        _fileStore = fileStore;
        _messageService = messageService;
    }

    #region Public Methods

    public async Task<List<TaskDto>> GetAllAsync(TaskCallerDto caller, CancellationToken cancellationToken)
    {
        return (await _taskRepository.GetTasksAsync(caller.UserId, cancellationToken)).Select(TaskMapper.ToDto).ToList();
    }

    public async Task<List<TaskDto>> GetDeletedAsync(TaskCallerDto caller, CancellationToken cancellationToken)
    {
        return (await _taskRepository.GetDeletedAsync(caller.UserId, cancellationToken)).Select(TaskMapper.ToDto).ToList();
    }

    public async Task<List<TaskHistoryDto>> GetHistoryAsync(TaskCallerDto caller, int taskId, CancellationToken cancellationToken)
    {
        return (await _taskRepository.GetHistoryAsync(caller.UserId, taskId, cancellationToken)).Select(TaskMapper.ToDto).ToList();
    }

    public async Task<ServiceResultDto<TaskChangesDto>> DeleteAsync(TaskCallerDto caller, int taskId, CancellationToken cancellationToken)
    {
        var task = await RequireTaskAsync(caller, taskId, cancellationToken);
        var work = new TaskWork();
        SoftDelete(task, caller, work);
        await SaveAsync(caller, work, cancellationToken);

        return await ResultAsync(work, MessageCodes.TasksDeleted);
    }

    public async Task<ServiceResultDto<TaskChangesDto>> ReopenAsync(TaskCallerDto caller, int taskId, CancellationToken cancellationToken)
    {
        var task = await RequireTaskAsync(caller, taskId, cancellationToken);
        var work = new TaskWork();
        Reopen(task, false, caller, work);
        await SaveAsync(caller, work, cancellationToken);

        return await ResultAsync(work, MessageCodes.TasksReopened);
    }

    public async Task<ServiceResultDto<TaskChangesDto>> RestoreAsync(TaskCallerDto caller, int taskId, CancellationToken cancellationToken)
    {
        var task = await _taskRepository.GetTaskAsync(caller.UserId, taskId, true, cancellationToken) ?? throw new BusinessException(MessageCodes.TasksNotFound, 404);
        var work = new TaskWork();
        task.IsSoftDeleted = false;
        task.DeletedOn = null;
        Touch(task, caller, work);
        work.Log(task, TaskHistoryActions.Restored);
        await SaveAsync(caller, work, cancellationToken);

        return await ResultAsync(work, MessageCodes.TasksRestored);
    }

    public async Task<ServiceResultDto<TaskChangesDto>> CompleteAsync(TaskCallerDto caller, int taskId, CancellationToken cancellationToken)
    {
        var task = await RequireTaskAsync(caller, taskId, cancellationToken);
        var work = new TaskWork();
        Complete(task, false, caller, work);
        await SaveAsync(caller, work, cancellationToken);

        return await ResultAsync(work, MessageCodes.TasksCompleted);
    }

    public async Task<ServiceResultDto<TaskChangesDto>> DuplicateAsync(TaskCallerDto caller, int taskId, CancellationToken cancellationToken)
    {
        var task = await RequireTaskAsync(caller, taskId, cancellationToken);
        var work = new TaskWork();
        await DuplicateAsync(task, caller, work, cancellationToken);
        await SaveAsync(caller, work, cancellationToken);

        return await ResultAsync(work, MessageCodes.TasksDuplicated);
    }

    public async Task<ServiceResultDto<TaskChangesDto>> CreateAsync(TaskCallerDto caller, TaskRequestDto request, CancellationToken cancellationToken)
    {
        await ValidateAsync(caller, request, cancellationToken);
        var work = new TaskWork();
        var task = new TaskItem { UserId = caller.UserId, CreatedBy = caller.AccountUserId };
        Apply(task, request, caller);
        work.Added.Add(task);
        work.Log(task, TaskHistoryActions.Created);
        Sync(task, false, caller, work);
        await SaveAsync(caller, work, cancellationToken);

        return await ResultAsync(work, MessageCodes.TasksAdded);
    }

    public async Task<ServiceResultDto<TaskChangesDto>> BulkAsync(TaskCallerDto caller, TaskBulkRequestDto request, CancellationToken cancellationToken)
    {
        var ids = request.Ids.Distinct().ToList();

        var limits = await _limits.GetAsync(cancellationToken);

        if (ids.Count == 0 || ids.Count > limits.MaxBulkTasks || !BulkActions.Contains(request.Action))
            throw new BusinessException(MessageCodes.TasksInvalid, 400);

        if (request.Action == TaskBulkActions.Category && request.CategoryId is { } categoryId && await _taskRepository.GetCategoryAsync(caller.UserId, categoryId, cancellationToken) is null)
            throw new BusinessException(MessageCodes.TasksCategoryNotFound, 404);

        var tasks = await _taskRepository.GetTasksAsync(caller.UserId, ids, cancellationToken);
        var work = new TaskWork();

        foreach (var task in tasks)
            await ApplyBulkAsync(task, request, caller, work, cancellationToken);

        await SaveAsync(caller, work, cancellationToken);

        return await ResultAsync(work, MessageCodes.TasksBulkDone, tasks.Count);
    }

    public async Task<TaskChangesDto> ToggleChecklistAsync(TaskCallerDto caller, int taskId, int itemId, bool isDone, CancellationToken cancellationToken)
    {
        var task = await RequireTaskAsync(caller, taskId, cancellationToken);
        var item = TaskMapper.Live(task.ChecklistItems).FirstOrDefault(c => c.Id == itemId) ?? throw new BusinessException(MessageCodes.TasksNotFound, 404);
        var work = new TaskWork();
        Touch(task, caller, work);

        if (item.IsDone != isDone)
        {
            item.IsDone = isDone;
            item.DoneOn = isDone ? DateTime.UtcNow : null;
            item.ModifiedOn = DateTime.UtcNow;
            Sync(task, !isDone, caller, work);
        }

        await SaveAsync(caller, work, cancellationToken);

        return work.ToDto();
    }

    public async Task<ServiceResultDto<TaskChangesDto>> UpdateAsync(TaskCallerDto caller, int taskId, TaskRequestDto request, CancellationToken cancellationToken)
    {
        var task = await RequireTaskAsync(caller, taskId, cancellationToken);
        await ValidateAsync(caller, request, cancellationToken);
        var work = new TaskWork();
        var changed = Changes(task, request);
        var unticked = Apply(task, request, caller);
        Touch(task, caller, work);

        if (changed.Count > 0)
            work.Log(task, TaskHistoryActions.Edited, string.Join(',', changed));

        Sync(task, unticked, caller, work);
        await SaveAsync(caller, work, cancellationToken);

        return await ResultAsync(work, MessageCodes.TasksSaved);
    }

    #endregion

    #region Private Methods

    private static DateOnly NextDue(TaskItem task)
    {
        var start = task.DueDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var every = Math.Max(1, task.RepeatEvery);
        var unit = task.RepeatType switch { TaskRepeatTypes.Daily => "day", TaskRepeatTypes.Weekly => "week", TaskRepeatTypes.Monthly => "month", TaskRepeatTypes.Yearly => "year", _ => task.RepeatUnit };

        return unit switch { "day" => start.AddDays(every), "week" => start.AddDays(7 * every), "month" => start.AddMonths(every), _ => start.AddYears(every) };
    }

    private static List<string> Changes(TaskItem task, TaskRequestDto request)
    {
        var lines = TaskMapper.Live(task.ChecklistItems).OrderBy(c => c.SortOrder).Select(c => (c.Id, c.Text, c.IsDone)).ToList();
        var asked = request.Checklist.Select(c => (c.Id ?? 0, c.Text.Trim(), c.IsDone)).ToList();
        var changes = new List<(bool Changed, string Field)>
        {
            (task.Title != request.Title.Trim(), "title"),
            ((task.Description ?? string.Empty) != (request.Description ?? string.Empty).Trim(), "description"),
            (task.DueDate != request.DueDate || task.DueTime != request.DueTime, "due"),
            (task.CategoryId != request.CategoryId, "category"),
            (task.Priority != request.Priority, "priority"),
            (task.IsStarted != request.IsStarted, "status"),
            (task.RemindEnabled != request.RemindEnabled, "reminder"),
            (task.RepeatType != request.RepeatType || task.RepeatEvery != request.RepeatEvery || task.RepeatUnit != request.RepeatUnit, "repeat"),
            (!lines.SequenceEqual(asked), "checklist")
        };

        return changes.Where(c => c.Changed).Select(c => c.Field).ToList();
    }

    private static void Touch(TaskItem task, TaskCallerDto caller, TaskWork work)
    {
        task.ModifiedBy = caller.AccountUserId;
        task.ModifiedOn = DateTime.UtcNow;

        if (!work.Changed.Contains(task))
            work.Changed.Add(task);
    }

    private static void SoftDelete(TaskItem task, TaskCallerDto caller, TaskWork work)
    {
        task.IsSoftDeleted = true;
        task.DeletedOn = DateTime.UtcNow;
        Touch(task, caller, work);
        work.DeletedIds.Add(task.Id);
        work.Log(task, TaskHistoryActions.Deleted);
    }

    private static TaskItem Copy(TaskItem task, DateOnly? dueDate, TaskCallerDto caller)
    {
        return new TaskItem
        {
            UserId = task.UserId,
            CategoryId = task.CategoryId,
            Title = task.Title,
            Description = task.Description,
            DueDate = dueDate,
            DueTime = dueDate is null ? null : task.DueTime,
            Priority = task.Priority,
            RemindEnabled = task.RemindEnabled,
            RepeatType = task.RepeatType,
            RepeatEvery = task.RepeatEvery,
            RepeatUnit = task.RepeatUnit,
            CreatedBy = caller.AccountUserId,
            ChecklistItems = TaskMapper.Live(task.ChecklistItems).OrderBy(c => c.SortOrder).Select((c, i) => new TaskChecklistItem { Text = c.Text, SortOrder = i, CreatedBy = caller.AccountUserId }).ToList()
        };
    }

    // The fields of the request onto the task. The checklist follows the request in order: known lines are updated, new ones added, missing ones removed (soft).
    // Returns true when a line that was ticked is now unticked.
    private static bool Apply(TaskItem task, TaskRequestDto request, TaskCallerDto caller)
    {
        var now = DateTime.UtcNow;
        var custom = request.RepeatType == TaskRepeatTypes.Custom;
        task.Title = request.Title.Trim();
        task.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        task.DueDate = request.DueDate;
        task.DueTime = request.DueDate is null ? null : request.DueTime;
        task.Priority = request.Priority;
        task.CategoryId = request.CategoryId;
        task.IsStarted = request.IsStarted;
        task.RemindEnabled = request.RemindEnabled;
        task.RepeatType = request.RepeatType;
        task.RepeatEvery = custom ? request.RepeatEvery : 1;
        task.RepeatUnit = custom ? request.RepeatUnit : string.Empty;
        var lines = TaskMapper.Live(task.ChecklistItems).ToList();
        var unticked = false;

        foreach (var (asked, order) in request.Checklist.Select((c, i) => (c, i)))
        {
            var line = asked.Id is { } id ? lines.FirstOrDefault(c => c.Id == id) : null;

            if (line is null)
            {
                task.ChecklistItems.Add(new TaskChecklistItem { Text = asked.Text.Trim(), IsDone = asked.IsDone, DoneOn = asked.IsDone ? now : null, SortOrder = order, CreatedBy = caller.AccountUserId });
                continue;
            }

            unticked |= line.IsDone && !asked.IsDone;
            line.DoneOn = asked.IsDone ? line.DoneOn ?? now : null;
            line.IsDone = asked.IsDone;
            line.Text = asked.Text.Trim();
            line.SortOrder = order;
            line.ModifiedOn = now;
        }

        foreach (var gone in lines.Where(c => request.Checklist.All(a => a.Id != c.Id)))
        {
            gone.IsSoftDeleted = true;
            gone.ModifiedOn = now;
        }

        return unticked;
    }

    private static void Reopen(TaskItem task, bool auto, TaskCallerDto caller, TaskWork work)
    {
        if (task.CompletedOn is null)
            return;

        task.LastCompletedOn = task.CompletedOn;
        task.CompletedOn = null;
        Touch(task, caller, work);
        work.Log(task, auto ? TaskHistoryActions.AutoReopened : TaskHistoryActions.Reopened);
    }

    private static void Sync(TaskItem task, bool unticked, TaskCallerDto caller, TaskWork work)
    {
        var lines = TaskMapper.Live(task.ChecklistItems).ToList();

        if (lines.Count == 0)
            return;

        if (lines.All(c => c.IsDone))
            Complete(task, true, caller, work);
        else if (unticked)
            Reopen(task, true, caller, work);
    }

    private static void Complete(TaskItem task, bool auto, TaskCallerDto caller, TaskWork work)
    {
        if (task.CompletedOn is not null)
            return;

        task.CompletedOn = DateTime.UtcNow;
        Touch(task, caller, work);
        work.Log(task, auto ? TaskHistoryActions.AutoCompleted : TaskHistoryActions.Completed);

        if (task.RepeatType == TaskRepeatTypes.None || task.RepeatSpawned)
            return;

        task.RepeatSpawned = true;
        var next = Copy(task, NextDue(task), caller);
        work.Added.Add(next);
        work.Log(next, TaskHistoryActions.Repeated, task.Title);
    }

    private async Task SaveAsync(TaskCallerDto caller, TaskWork work, CancellationToken cancellationToken)
    {
        foreach (var task in work.Added)
            await _taskRepository.AddTaskAsync(task, cancellationToken);

        await _taskRepository.SaveChangesAsync(cancellationToken);
        await _taskRepository.AddHistoryAsync(work.History.Select(h => new TaskHistory { TaskId = h.Task.Id, Action = h.Action, Detail = h.Detail, CreatedBy = caller.AccountUserId }), cancellationToken);
    }

    private async Task ValidateAsync(TaskCallerDto caller, TaskRequestDto request, CancellationToken cancellationToken)
    {
        var title = request.Title.Trim();

        if (title.Length == 0)
            throw new BusinessException(MessageCodes.TasksTitleRequired, 400);

        var limits = await _limits.GetAsync(cancellationToken);

        if (request.Checklist.Count > limits.MaxChecklistItems)
            throw new BusinessException(MessageCodes.TasksChecklistLimit, 400, limits.MaxChecklistItems);

        var custom = request.RepeatType == TaskRepeatTypes.Custom;
        var valid = title.Length <= TitleLength && (request.Description?.Trim().Length ?? 0) <= DescriptionLength && request.Priority is >= 1 and <= 3 && TaskRepeatTypes.All.Contains(request.RepeatType) && (!custom || (request.RepeatEvery is >= 1 and <= 99 && TaskRepeatTypes.Units.Contains(request.RepeatUnit)));

        if (!valid || request.Checklist.Any(c => c.Text.Trim().Length is 0 or > ItemLength))
            throw new BusinessException(MessageCodes.TasksInvalid, 400);

        if (request.CategoryId is { } categoryId && await _taskRepository.GetCategoryAsync(caller.UserId, categoryId, cancellationToken) is null)
            throw new BusinessException(MessageCodes.TasksCategoryNotFound, 404);
    }

    private async Task<TaskItem> RequireTaskAsync(TaskCallerDto caller, int taskId, CancellationToken cancellationToken)
    {
        return await _taskRepository.GetTaskAsync(caller.UserId, taskId, cancellationToken) ?? throw new BusinessException(MessageCodes.TasksNotFound, 404);
    }

    private async Task<ServiceResultDto<TaskChangesDto>> ResultAsync(TaskWork work, string code, params object[] arguments)
    {
        return new ServiceResultDto<TaskChangesDto> { Data = work.ToDto(), Message = await _messageService.GetAsync(code, arguments) };
    }

    // A copy keeps the checklist (unticked) and the pictures (each file copied, so removing one never removes the other).
    private async Task DuplicateAsync(TaskItem task, TaskCallerDto caller, TaskWork work, CancellationToken cancellationToken)
    {
        var copy = Copy(task, task.DueDate, caller);

        foreach (var picture in TaskMapper.Live(task.Attachments))
        {
            var fileId = $"{caller.UserId}/{Guid.NewGuid():N}{Path.GetExtension(picture.FileId)}";
            await _fileStore.CopyAsync(picture.FileId, fileId, cancellationToken);
            copy.Attachments.Add(new TaskAttachment { FileId = fileId, FileName = picture.FileName, ContentType = picture.ContentType, SizeBytes = picture.SizeBytes, SortOrder = picture.SortOrder, CreatedBy = caller.AccountUserId });
        }

        work.Added.Add(copy);
        work.Log(copy, TaskHistoryActions.Duplicated, task.Title);
    }

    private async Task ApplyBulkAsync(TaskItem task, TaskBulkRequestDto request, TaskCallerDto caller, TaskWork work, CancellationToken cancellationToken)
    {
        switch (request.Action)
        {
            case TaskBulkActions.Complete:
                Complete(task, false, caller, work);
                break;
            case TaskBulkActions.Reopen:
                Reopen(task, false, caller, work);
                break;
            case TaskBulkActions.Delete:
                SoftDelete(task, caller, work);
                break;
            case TaskBulkActions.Duplicate:
                await DuplicateAsync(task, caller, work, cancellationToken);
                break;
            case TaskBulkActions.Category when task.CategoryId != request.CategoryId:
                task.CategoryId = request.CategoryId;
                Touch(task, caller, work);
                work.Log(task, TaskHistoryActions.Edited, "category");
                break;
        }
    }

    #endregion
}
