using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

// What the user chose for a merchant (TrackerCategoryRules): every later transaction of that merchant goes to this category (CategoryCode) and/or counts
// towards this flow (FlowCode, for example a family member's transfers as money borrowed).
public class TrackerCategoryRule : BaseEntity
{
    public int Id { get; set; }

    public int TrackerUserId { get; set; }

    public string? FlowCode { get; set; }

    public string? CategoryCode { get; set; }

    public string MerchantKey { get; set; } = string.Empty;
}
