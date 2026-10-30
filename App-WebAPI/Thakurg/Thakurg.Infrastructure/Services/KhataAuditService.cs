using System.Text.Json;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Khata;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Services;

public class KhataAuditService : IKhataAuditService
{
    private const int UserAgentLength = 300;

    private readonly IKhataAuthRepository _authRepository;

    public KhataAuditService(IKhataAuthRepository authRepository)
    {
        _authRepository = authRepository;
    }

    #region Public Methods

    public Task WriteAsync(string action, int? userId, KhataCallerDto caller, object? details, CancellationToken cancellationToken)
    {
        var userAgent = caller.UserAgent is { Length: > UserAgentLength } text ? text[..UserAgentLength] : caller.UserAgent;
        var entry = new KhataAuditLog { UserId = userId, Action = action, Details = details is null ? null : JsonSerializer.Serialize(details), RequestIp = caller.Ip, UserAgent = userAgent };

        return _authRepository.AddAuditAsync(entry, cancellationToken);
    }

    #endregion
}
