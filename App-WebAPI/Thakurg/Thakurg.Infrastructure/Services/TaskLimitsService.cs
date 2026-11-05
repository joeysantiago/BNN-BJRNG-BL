using Microsoft.Extensions.Caching.Memory;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Tasks;

namespace Thakurg.Infrastructure.Services;

// The limits of My Tasks, read from the AppSettings table (rows Tasks.*, INSERT/Common/002_AppSettings.sql) and kept in memory for a minute.
// A missing or invalid row is a setup error: the call fails instead of falling back to a value typed in code.
public class TaskLimitsService : ITaskLimitsService
{
    private readonly IMemoryCache _cache;

    private const string CacheKey = "tasks-limits";

    private readonly ISettingsRepository _settingsRepository;

    private static readonly TimeSpan CacheTime = TimeSpan.FromMinutes(1);

    public TaskLimitsService(ISettingsRepository settingsRepository, IMemoryCache cache)
    {
        _settingsRepository = settingsRepository;
        _cache = cache;
    }

    #region Public Methods

    public async Task<TaskLimitsDto> GetAsync(CancellationToken cancellationToken)
    {
        if (_cache.TryGetValue(CacheKey, out TaskLimitsDto? cached) && cached is not null)
            return cached;

        var rows = (await _settingsRepository.GetAppSettingsAsync(cancellationToken)).Where(s => s.Code.StartsWith("Tasks.")).ToDictionary(s => s.Code, s => s.Value);
        var limits = new TaskLimitsDto
        {
            MaxPhotosPerTask = (int)Read(rows, "Tasks.MaxPhotosPerTask"),
            MaxPhotoBytes = Read(rows, "Tasks.MaxPhotoBytes"),
            MaxPickedBytes = Read(rows, "Tasks.MaxPickedBytes"),
            PhotoEdgePx = (int)Read(rows, "Tasks.PhotoEdgePx"),
            MaxChecklistItems = (int)Read(rows, "Tasks.MaxChecklistItems"),
            MaxCategories = (int)Read(rows, "Tasks.MaxCategories"),
            MaxBulkTasks = (int)Read(rows, "Tasks.MaxBulkTasks")
        };

        return _cache.Set(CacheKey, limits, CacheTime);
    }

    #endregion

    #region Private Methods

    private static long Read(Dictionary<string, string> rows, string code)
    {
        if (rows.TryGetValue(code, out var text) && long.TryParse(text, out var value) && value > 0)
            return value;

        throw new InvalidOperationException($"AppSettings row {code} is missing or not a positive number.");
    }

    #endregion
}
