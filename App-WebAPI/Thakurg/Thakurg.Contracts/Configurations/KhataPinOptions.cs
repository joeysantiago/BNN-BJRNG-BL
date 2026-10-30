namespace Thakurg.Contracts.Configurations;

public class KhataPinOptions
{
    public int MaxTries { get; set; }

    public int MaxLength { get; set; }

    public int MinLength { get; set; }

    public int ProofSeconds { get; set; }

    public int LockoutMinutes { get; set; }

    public int ResetAfterTries { get; set; }

    public int FreshLoginMinutes { get; set; }
}
