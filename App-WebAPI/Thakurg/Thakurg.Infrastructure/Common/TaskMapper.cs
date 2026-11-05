using Thakurg.Contracts.Tasks;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Common;

// Entities of My Tasks to the DTOs the app reads. Removed checklist lines and pictures (soft-deleted) are left out.
public static class TaskMapper
{
    #region Public Methods

    public static TaskDto ToDto(TaskItem task)
    {
        return new TaskDto
        {
            Id = task.Id,
            Title = task.Title,
            Description = task.Description,
            DueDate = task.DueDate,
            DueTime = task.DueTime,
            Priority = task.Priority,
            CategoryId = task.CategoryId,
            IsStarted = task.IsStarted,
            RemindEnabled = task.RemindEnabled,
            RepeatType = task.RepeatType,
            RepeatEvery = task.RepeatEvery,
            RepeatUnit = task.RepeatUnit,
            CreatedOn = task.CreatedOn,
            ModifiedOn = task.ModifiedOn,
            CompletedOn = task.CompletedOn,
            DeletedOn = task.DeletedOn,
            Checklist = Live(task.ChecklistItems).OrderBy(c => c.SortOrder).ThenBy(c => c.Id).Select(c => new TaskChecklistItemDto { Id = c.Id, Text = c.Text, IsDone = c.IsDone, DoneOn = c.DoneOn }).ToList(),
            Attachments = Live(task.Attachments).OrderBy(a => a.SortOrder).ThenBy(a => a.Id).Select(a => new TaskAttachmentDto { Id = a.Id, FileName = a.FileName, ContentType = a.ContentType, SizeBytes = a.SizeBytes }).ToList()
        };
    }

    public static TaskHistoryDto ToDto(TaskHistory history)
    {
        return new TaskHistoryDto { At = history.CreatedOn, Action = history.Action, Detail = history.Detail };
    }

    public static TaskCategoryDto ToDto(TaskCategory category, int taskCount)
    {
        return new TaskCategoryDto { Id = category.Id, Code = category.Code, Name = category.Name, Color = category.Color, IsSystem = category.IsSystem, TaskCount = taskCount };
    }

    public static IEnumerable<T> Live<T>(IEnumerable<T> rows) where T : Domain.Common.BaseEntity
    {
        return rows.Where(r => !r.IsSoftDeleted && !r.IsDeleted);
    }

    #endregion
}
