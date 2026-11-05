using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Application.Storage;
using Thakurg.Contracts.Abstractions;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Tasks;
using Thakurg.Contracts.Wrappers;
using Thakurg.Domain.Entities;
using Thakurg.Infrastructure.Common;

namespace Thakurg.Infrastructure.Services;

// The pictures of a task: at most MaxPhotosPerTask, each at most MaxPhotoBytes, and really a JPG, PNG, GIF or WebP picture (read from its bytes).
// Only the owner of the task can add, open or remove them; the repository finds a picture only through a live task of the caller.
public class TaskAttachmentService : ITaskAttachmentService
{
    private const int FileNameLength = 120;

    private readonly ITaskFileStore _fileStore;

    private readonly ITaskLimitsService _limits;

    private readonly IMessageService _messageService;

    private readonly ITaskRepository _taskRepository;

    public TaskAttachmentService(ITaskLimitsService limits, ITaskRepository taskRepository, ITaskFileStore fileStore, IMessageService messageService)
    {
        _limits = limits;
        _taskRepository = taskRepository;
        _fileStore = fileStore;
        _messageService = messageService;
    }

    #region Public Methods

    public async Task<FileStreamDto> OpenAsync(TaskCallerDto caller, int attachmentId, CancellationToken cancellationToken)
    {
        var attachment = await _taskRepository.GetAttachmentAsync(caller.UserId, attachmentId, cancellationToken) ?? throw new BusinessException(MessageCodes.TasksPhotoNotFound, 404);
        var content = await _fileStore.OpenAsync(attachment.FileId) ?? throw new BusinessException(MessageCodes.TasksPhotoNotFound, 404);

        return new FileStreamDto { Content = content, ContentType = attachment.ContentType, FileName = attachment.FileName };
    }

    public async Task<ServiceResultDto<TaskChangesDto>> RemoveAsync(TaskCallerDto caller, int attachmentId, CancellationToken cancellationToken)
    {
        var attachment = await _taskRepository.GetAttachmentAsync(caller.UserId, attachmentId, cancellationToken) ?? throw new BusinessException(MessageCodes.TasksPhotoNotFound, 404);
        attachment.IsSoftDeleted = true;
        attachment.ModifiedBy = caller.AccountUserId;
        attachment.ModifiedOn = DateTime.UtcNow;
        await _taskRepository.SaveChangesAsync(cancellationToken);
        await _fileStore.DeleteAsync(attachment.FileId);
        var task = await _taskRepository.GetTaskAsync(caller.UserId, attachment.TaskId, cancellationToken) ?? throw new BusinessException(MessageCodes.TasksNotFound, 404);

        return new ServiceResultDto<TaskChangesDto> { Data = new TaskChangesDto { Tasks = [TaskMapper.ToDto(task)] }, Message = await _messageService.GetAsync(MessageCodes.TasksPhotoRemoved) };
    }

    public async Task<ServiceResultDto<TaskChangesDto>> UploadAsync(TaskCallerDto caller, int taskId, List<TaskPhotoUploadDto> files, CancellationToken cancellationToken)
    {
        var task = await _taskRepository.GetTaskAsync(caller.UserId, taskId, cancellationToken) ?? throw new BusinessException(MessageCodes.TasksNotFound, 404);
        var count = TaskMapper.Live(task.Attachments).Count();
        var limits = await _limits.GetAsync(cancellationToken);
        var megabytes = Math.Max(1, limits.MaxPhotoBytes / (1024 * 1024));

        if (files.Count == 0 || count + files.Count > limits.MaxPhotosPerTask)
            throw new BusinessException(MessageCodes.TasksPhotoLimit, 400, limits.MaxPhotosPerTask);

        var pictures = new List<(byte[] Bytes, string Type, string Name)>();

        foreach (var file in files)
        {
            if (file.Length <= 0 || file.Length > limits.MaxPhotoBytes)
                throw new BusinessException(MessageCodes.TasksPhotoInvalid, 400, megabytes);

            using var buffer = new MemoryStream();
            await file.Content.CopyToAsync(buffer, cancellationToken);
            var bytes = buffer.ToArray();
            var type = bytes.Length <= limits.MaxPhotoBytes ? TaskImageType.Detect(bytes) : null;
            pictures.Add((bytes, type ?? throw new BusinessException(MessageCodes.TasksPhotoInvalid, 400, megabytes), SafeName(file.FileName)));
        }

        var written = new List<string>();

        try
        {
            foreach (var (bytes, type, name) in pictures)
            {
                var fileId = $"{caller.UserId}/{Guid.NewGuid():N}{TaskImageType.Extensions[type]}";
                await _fileStore.SaveAsync(fileId, bytes, cancellationToken);
                written.Add(fileId);
                task.Attachments.Add(new TaskAttachment { FileId = fileId, FileName = name, ContentType = type, SizeBytes = bytes.Length, SortOrder = count++, CreatedBy = caller.AccountUserId });
            }

            task.ModifiedOn = DateTime.UtcNow;
            task.ModifiedBy = caller.AccountUserId;
            await _taskRepository.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            foreach (var fileId in written)
                await _fileStore.DeleteAsync(fileId);

            throw;
        }

        await _taskRepository.AddHistoryAsync([new TaskHistory { TaskId = task.Id, Action = TaskHistoryActions.Edited, Detail = "attachments", CreatedBy = caller.AccountUserId }], cancellationToken);

        return new ServiceResultDto<TaskChangesDto> { Data = new TaskChangesDto { Tasks = [TaskMapper.ToDto(task)] }, Message = await _messageService.GetAsync(MessageCodes.TasksPhotoAdded) };
    }

    #endregion

    #region Private Methods

    private static string SafeName(string fileName)
    {
        var name = new string(Path.GetFileName(fileName).Where(c => !Path.GetInvalidFileNameChars().Contains(c)).ToArray()).Trim();

        return name.Length > FileNameLength ? name[..FileNameLength] : name;
    }

    #endregion
}
