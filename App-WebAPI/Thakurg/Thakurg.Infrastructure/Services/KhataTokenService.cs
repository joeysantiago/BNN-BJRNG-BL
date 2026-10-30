using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Khata;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Services;

public class KhataTokenService : IKhataTokenService
{
    private readonly KhataOptions _options;

    private readonly JsonWebTokenHandler _handler = new();

    public KhataTokenService(IOptions<KhataOptions> options)
    {
        _options = options.Value;
    }

    #region Public Methods

    public string NewSecret()
    {
        return Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(32));
    }

    public string Hash(string value)
    {
        return Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
    }

    public string HashOtp(string identifier, string code)
    {
        return Convert.ToHexStringLower(HMACSHA256.HashData(Encoding.UTF8.GetBytes(_options.Otp.HmacSecret), Encoding.UTF8.GetBytes(identifier + ":" + code)));
    }

    // The access token carries pin = "true" only after the PIN was entered (KhataPolicies.Unlocked).
    public KhataAuthResultDto CreateResult(KhataUser user, int sessionId, bool unlocked)
    {
        var lifetime = TimeSpan.FromMinutes(_options.Jwt.AccessMinutes);
        var claims = new Dictionary<string, object> { [KhataClaimTypes.Subject] = user.Id.ToString(), [KhataClaimTypes.Session] = sessionId.ToString(), [KhataClaimTypes.Unlocked] = unlocked ? "true" : "false" };
        var signing = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Jwt.Secret)), SecurityAlgorithms.HmacSha256);
        var token = _handler.CreateToken(new SecurityTokenDescriptor { Issuer = _options.Jwt.Issuer, Audience = _options.Jwt.Issuer, Expires = DateTime.UtcNow.Add(lifetime), Claims = claims, SigningCredentials = signing });

        return new KhataAuthResultDto { AccessToken = token, ExpiresInSeconds = (int)lifetime.TotalSeconds, Unlocked = unlocked, HasPin = user.PinHash is not null, DisplayName = user.DisplayName, StorageProvider = user.StorageProvider };
    }

    #endregion
}
