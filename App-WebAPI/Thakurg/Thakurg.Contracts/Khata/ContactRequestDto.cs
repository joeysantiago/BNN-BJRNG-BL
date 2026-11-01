namespace Thakurg.Contracts.Khata;

public class ContactRequestDto
{
    public string? Note { get; set; }

    public string? Email { get; set; }

    public string? Mobile { get; set; }

    public string? Address { get; set; }

    public string? RowVersion { get; set; }

    public string Name { get; set; } = string.Empty;

    public KhataContactType ContactType { get; set; }
}
