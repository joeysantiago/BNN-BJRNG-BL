using Thakurg.Application.Services;

namespace Thakurg.Application.Common;

// Bundle of the login-session services AuthService needs (App-Document/constructor-injection-limit.md).
public interface IAuthSessionServices
{
    IAuthSessionCache Cache { get; }

    IAuthTokenService Tokens { get; }
}
