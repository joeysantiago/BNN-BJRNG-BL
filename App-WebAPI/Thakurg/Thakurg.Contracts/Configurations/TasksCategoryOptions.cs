namespace Thakurg.Contracts.Configurations;

// One built-in category of Tasks:NewUser:Categories. IsSystem = cannot be renamed or deleted (Marketing).
public class TasksCategoryOptions
{
    public bool IsSystem { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Color { get; set; } = string.Empty;
}
