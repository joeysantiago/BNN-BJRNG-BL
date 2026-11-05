using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

// A category of one user's tasks. Code is set for the built-in categories (the UI names them in the reader's language); Marketing is a system category that cannot be renamed or deleted.
public class TaskCategory : BaseEntity
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public string? Code { get; set; }

    public bool IsSystem { get; set; }

    public int SortOrder { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Color { get; set; } = string.Empty;
}
