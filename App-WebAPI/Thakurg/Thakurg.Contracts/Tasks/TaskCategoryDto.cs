namespace Thakurg.Contracts.Tasks;

// Code is set for the built-in categories, so the app can name them in the language of the reader.
public class TaskCategoryDto
{
    public int Id { get; set; }

    public string? Code { get; set; }

    public bool IsSystem { get; set; }

    public int TaskCount { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Color { get; set; } = string.Empty;
}
