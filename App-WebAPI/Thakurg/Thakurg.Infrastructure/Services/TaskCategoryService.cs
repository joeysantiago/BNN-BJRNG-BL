using System.Text.RegularExpressions;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Tasks;
using Thakurg.Contracts.Wrappers;
using Thakurg.Domain.Entities;
using Thakurg.Infrastructure.Common;

namespace Thakurg.Infrastructure.Services;

// The categories of the tasks of a user. Marketing (IsSystem) keeps its name and cannot be deleted; deleting another category leaves its tasks without one.
public partial class TaskCategoryService : ITaskCategoryService
{
    private const int NameLength = 40;

    private readonly ITaskLimitsService _limits;

    private readonly IMessageService _messageService;

    private readonly ITaskRepository _taskRepository;

    private readonly ITaskUserRepository _userRepository;

    public TaskCategoryService(ITaskLimitsService limits, ITaskRepository taskRepository, ITaskUserRepository userRepository, IMessageService messageService)
    {
        _limits = limits;
        _taskRepository = taskRepository;
        _userRepository = userRepository;
        _messageService = messageService;
    }

    #region Public Methods

    public async Task<List<TaskCategoryDto>> GetAsync(TaskCallerDto caller, CancellationToken cancellationToken)
    {
        var categories = await _taskRepository.GetCategoriesAsync(caller.UserId, cancellationToken);
        var counts = await _taskRepository.CountByCategoryAsync(caller.UserId, cancellationToken);

        return categories.Select(c => TaskMapper.ToDto(c, counts.GetValueOrDefault(c.Id))).ToList();
    }

    public async Task<ServiceResultDto<int>> DeleteAsync(TaskCallerDto caller, int categoryId, CancellationToken cancellationToken)
    {
        var category = await _taskRepository.GetCategoryAsync(caller.UserId, categoryId, cancellationToken) ?? throw new BusinessException(MessageCodes.TasksCategoryNotFound, 404);

        if (category.IsSystem)
            throw new BusinessException(MessageCodes.TasksCategorySystem, 400);

        var now = DateTime.UtcNow;
        category.IsSoftDeleted = true;
        category.ModifiedBy = caller.AccountUserId;
        category.ModifiedOn = now;
        var user = await _userRepository.GetAsync(caller.UserId, cancellationToken);

        if (user?.DefaultCategoryId == categoryId)
            user.DefaultCategoryId = null;

        await _taskRepository.SaveChangesAsync(cancellationToken);
        await _taskRepository.ClearCategoryAsync(caller.UserId, categoryId, now, cancellationToken);

        return new ServiceResultDto<int> { Data = categoryId, Message = await _messageService.GetAsync(MessageCodes.TasksCategoryDeleted) };
    }

    public async Task<ServiceResultDto<TaskCategoryDto>> CreateAsync(TaskCallerDto caller, TaskCategoryRequestDto request, CancellationToken cancellationToken)
    {
        var (name, color) = Validate(request);
        var count = await _taskRepository.CountCategoriesAsync(caller.UserId, cancellationToken);

        var limits = await _limits.GetAsync(cancellationToken);

        if (count >= limits.MaxCategories)
            throw new BusinessException(MessageCodes.TasksCategoryLimit, 400, limits.MaxCategories);

        var category = new TaskCategory { UserId = caller.UserId, Name = name, Color = color, SortOrder = count, CreatedBy = caller.AccountUserId };
        await _taskRepository.AddCategoryAsync(category, cancellationToken);

        return new ServiceResultDto<TaskCategoryDto> { Data = TaskMapper.ToDto(category, 0), Message = await _messageService.GetAsync(MessageCodes.TasksCategorySaved) };
    }

    // A renamed built-in category loses its code, so the app shows the new name instead of the translated one.
    public async Task<ServiceResultDto<TaskCategoryDto>> UpdateAsync(TaskCallerDto caller, int categoryId, TaskCategoryRequestDto request, CancellationToken cancellationToken)
    {
        var (name, color) = Validate(request);
        var category = await _taskRepository.GetCategoryAsync(caller.UserId, categoryId, cancellationToken) ?? throw new BusinessException(MessageCodes.TasksCategoryNotFound, 404);

        if (category.IsSystem && name != category.Name)
            throw new BusinessException(MessageCodes.TasksCategorySystem, 400);

        if (name != category.Name)
            category.Code = null;

        category.Name = name;
        category.Color = color;
        category.ModifiedBy = caller.AccountUserId;
        category.ModifiedOn = DateTime.UtcNow;
        await _taskRepository.SaveChangesAsync(cancellationToken);
        var counts = await _taskRepository.CountByCategoryAsync(caller.UserId, cancellationToken);

        return new ServiceResultDto<TaskCategoryDto> { Data = TaskMapper.ToDto(category, counts.GetValueOrDefault(category.Id)), Message = await _messageService.GetAsync(MessageCodes.TasksCategorySaved) };
    }

    #endregion

    #region Private Methods

    [GeneratedRegex("^#[0-9a-fA-F]{6}$")]
    private static partial Regex ColorPattern();

    private static (string Name, string Color) Validate(TaskCategoryRequestDto request)
    {
        var name = request.Name.Trim();

        if (name.Length is 0 or > NameLength || !ColorPattern().IsMatch(request.Color))
            throw new BusinessException(MessageCodes.TasksInvalid, 400);

        return (name, request.Color.ToLowerInvariant());
    }

    #endregion
}
