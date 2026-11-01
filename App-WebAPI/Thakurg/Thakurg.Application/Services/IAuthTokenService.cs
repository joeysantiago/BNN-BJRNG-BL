using Thakurg.Contracts.Auth;
using Thakurg.Domain.Entities;

namespace Thakurg.Application.Services;

public interface IAuthTokenService
{
    string NewSecret();

    string Hash(string value);

    AuthResultDto CreateResult(User user, int sessionId, List<string> apps);
}
