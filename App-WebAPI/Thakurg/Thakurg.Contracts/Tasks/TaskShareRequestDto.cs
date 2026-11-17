namespace Thakurg.Contracts.Tasks;

// Shares a task. To is the e-mail address or mobile number of an account; Permission is read or edit (TaskSharePermissions).
public class TaskShareRequestDto
{
    public string To { get; set; } = string.Empty;

    public string Permission { get; set; } = string.Empty;
}
