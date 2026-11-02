using Thakurg.Contracts.Auth;

namespace Thakurg.Application.Services;

public interface IAuthTokenService
{
    string NewSecret();

    string Hash(string value);

    AuthResultDto CreateResult(UserDto user, int sessionId);
}
