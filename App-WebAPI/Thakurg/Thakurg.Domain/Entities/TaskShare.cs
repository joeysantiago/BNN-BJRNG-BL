using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

// A task shared with another account. UserId is that account (Users.Id); SharedWith is the e-mail or mobile number the owner typed.
// Permission and Status are the codes of TaskSharePermissions and TaskShareStatuses.
public class TaskShare : BaseEntity
{
    public int Id { get; set; }

    public int TaskId { get; set; }

    public int UserId { get; set; }

    public DateTime? RespondedOn { get; set; }

    public string Status { get; set; } = string.Empty;

    public string Permission { get; set; } = string.Empty;

    public string SharedWith { get; set; } = string.Empty;
}
