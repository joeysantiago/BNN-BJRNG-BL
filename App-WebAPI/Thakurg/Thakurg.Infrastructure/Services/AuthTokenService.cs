using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Configurations;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Services;

public class AuthTokenService : IAuthTokenService
{
    private readonly AuthOptions _options;

    private readonly JsonWebTokenHandler _handler = new();

    public AuthTokenService(IOptions<AuthOptions> options)
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

    // The token names only the user and the session; admin rights and app access are read from the database on every request.
    public AuthResultDto CreateResult(User user, int sessionId, List<string> apps)
    {
        var lifetime = TimeSpan.FromMinutes(_options.Jwt.AccessMinutes);
        var claims = new Dictionary<string, object> { [AuthClaimTypes.Subject] = user.Id.ToString(), [AuthClaimTypes.Session] = sessionId.ToString() };
        var signing = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Jwt.Secret)), SecurityAlgorithms.HmacSha256);
        var token = _handler.CreateToken(new SecurityTokenDescriptor { Issuer = _options.Jwt.Issuer, Audience = _options.Jwt.Issuer, Expires = DateTime.UtcNow.Add(lifetime), Claims = claims, SigningCredentials = signing });
        var dto = new UserDto { Id = user.Id, Email = user.Email, DisplayName = user.DisplayName, Language = user.Language, IsAdmin = user.IsAdmin, Apps = apps };

        return new AuthResultDto { AccessToken = token, ExpiresInSeconds = (int)lifetime.TotalSeconds, User = dto };
    }

    #endregion
}
