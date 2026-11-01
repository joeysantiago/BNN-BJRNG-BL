using System.Security.Cryptography;
using System.Text;
using Thakurg.Application.Common;

namespace Thakurg.Infrastructure.Common;

public class PasswordHasher : IPasswordHasher
{
    private const string Prefix = "v2";

    private const int Iterations = 100000;

    #region Public Methods

    public string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, 32);

        return $"{Prefix}.{Iterations}.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
    }

    public bool Verify(string password, string stored)
    {
        var parts = stored.Split('.');

        if (parts.Length == 4 && parts[0] == Prefix && int.TryParse(parts[1], out var iterations))
            return CryptographicOperations.FixedTimeEquals(Rfc2898DeriveBytes.Pbkdf2(password, Convert.FromBase64String(parts[2]), iterations, HashAlgorithmName.SHA256, 32), Convert.FromBase64String(parts[3]));

        return CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(password)))), Encoding.UTF8.GetBytes(stored.ToLowerInvariant()));
    }

    #endregion
}
