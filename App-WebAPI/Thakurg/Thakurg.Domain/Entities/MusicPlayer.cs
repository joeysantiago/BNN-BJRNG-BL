using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

public class MusicPlayer : BaseEntity
{
    public int Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string FolderName { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;
}
