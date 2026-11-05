namespace Thakurg.Contracts.Tasks;

// The limits of My Tasks, from the AppSettings table (codes Tasks.*). The server enforces them; the app reads them with its settings.
public class TaskLimitsDto
{
    public int PhotoEdgePx { get; set; }

    public int MaxBulkTasks { get; set; }

    public int MaxCategories { get; set; }

    public long MaxPhotoBytes { get; set; }

    public long MaxPickedBytes { get; set; }

    public int MaxPhotosPerTask { get; set; }

    public int MaxChecklistItems { get; set; }
}
