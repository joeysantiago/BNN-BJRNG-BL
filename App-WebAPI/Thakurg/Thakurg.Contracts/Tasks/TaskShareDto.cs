namespace Thakurg.Contracts.Tasks;

// One person a task is shared with, as its owner sees it. SharedWith is the e-mail or mobile number the owner typed.
public class TaskShareDto
{
    public int Id { get; set; }

    public DateTime CreatedOn { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string Permission { get; set; } = string.Empty;

    public string SharedWith { get; set; } = string.Empty;
}
