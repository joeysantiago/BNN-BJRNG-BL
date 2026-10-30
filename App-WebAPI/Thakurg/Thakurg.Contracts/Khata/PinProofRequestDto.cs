namespace Thakurg.Contracts.Khata;

public class PinProofRequestDto
{
    public int? TargetId { get; set; }

    public KhataPinPurpose Purpose { get; set; }

    public string Pin { get; set; } = string.Empty;
}
