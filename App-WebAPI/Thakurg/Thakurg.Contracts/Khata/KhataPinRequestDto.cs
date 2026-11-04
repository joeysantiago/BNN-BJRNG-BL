namespace Thakurg.Contracts.Khata;

// PUT api/khata/pin (set or change; CurrentPin is needed to change it unless the login is fresh) and POST api/khata/pin/verify (Pin only).
public class KhataPinRequestDto
{
    public string? CurrentPin { get; set; }

    public string Pin { get; set; } = string.Empty;
}
