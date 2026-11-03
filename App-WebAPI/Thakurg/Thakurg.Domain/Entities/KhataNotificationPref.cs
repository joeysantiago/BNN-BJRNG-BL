using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

// Which messages a party (contact) gets about entries on their account. NotifyPush = in the app.
public class KhataNotificationPref : BaseEntity
{
    public int Id { get; set; }

    public int ContactId { get; set; }

    public bool NotifySms { get; set; }

    public bool NotifyPush { get; set; }

    public bool NotifyEmail { get; set; }

    public DateTime? ConsentChangedOn { get; set; }

    public int? ConsentChangedByUserId { get; set; }
}
