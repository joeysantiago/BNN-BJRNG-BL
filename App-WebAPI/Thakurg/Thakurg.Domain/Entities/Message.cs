using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

public class Message : BaseEntity
{
    public int Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Texts { get; set; } = string.Empty;
}
