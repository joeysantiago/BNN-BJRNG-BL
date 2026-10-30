namespace Thakurg.Contracts.Khata;

public class PinProofDto
{
    public int ExpiresInSeconds { get; set; }

    public string Proof { get; set; } = string.Empty;
}
