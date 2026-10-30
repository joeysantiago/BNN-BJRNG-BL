namespace Thakurg.Contracts.Configurations;

public class KhataPinOptions
{
    public int MaxTries { get; set; } = 5;

    public int MaxLength { get; set; } = 6;

    public int MinLength { get; set; } = 4;

    public int ProofSeconds { get; set; } = 120;

    public int LockoutMinutes { get; set; } = 15;

    public int ResetAfterTries { get; set; } = 10;

    public int FreshLoginMinutes { get; set; } = 10;
}
