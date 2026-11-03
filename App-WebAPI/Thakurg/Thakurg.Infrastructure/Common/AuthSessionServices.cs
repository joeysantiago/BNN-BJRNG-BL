using Thakurg.Application.Common;
using Thakurg.Application.Services;

namespace Thakurg.Infrastructure.Common;

// Bundle of the login-session services AuthService needs (App-Document/constructor-injection-limit.md).
public class AuthSessionServices : IAuthSessionServices
{
    public IAuthSessionCache Cache { get; }

    public IAuthTokenService Tokens { get; }

    public AuthSessionServices(IAuthTokenService tokens, IAuthSessionCache cache)
    {
        Tokens = tokens;
        Cache = cache;
    }
}
