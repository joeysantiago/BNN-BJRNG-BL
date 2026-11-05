namespace Thakurg.Contracts.Tasks;

// Sets a new PIN (CurrentPin is needed when one exists and the login is not fresh), or checks or removes one (Pin only).
public class TaskPinRequestDto
{
    public string? CurrentPin { get; set; }

    public string Pin { get; set; } = string.Empty;
}
