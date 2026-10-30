using Thakurg.Contracts.Khata;
using Thakurg.Domain.Entities;

namespace Thakurg.Application.Services;

public interface IKhataTokenService
{
    string NewSecret();

    string Hash(string value);

    string HashOtp(string identifier, string code);

    KhataAuthResultDto CreateResult(KhataUser user, int sessionId, bool unlocked);
}
