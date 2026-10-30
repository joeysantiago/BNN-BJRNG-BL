using System.Text.Json;
using Microsoft.Extensions.Options;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Khata;
using Thakurg.Contracts.Messages;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Services;

// Design S1: a create sent twice with the same X-Idempotency-Key (double tap, network retry) runs once; the repeat gets the first result back.
public class KhataIdempotencyService : IKhataIdempotencyService
{
    private const int CompletedStatus = 200;

    private readonly KhataLimitsOptions _limits;

    private readonly IKhataTokenService _tokenService;

    private readonly IKhataIdempotencyRepository _idempotencyRepository;

    public KhataIdempotencyService(IOptions<KhataOptions> options, IKhataTokenService tokenService, IKhataIdempotencyRepository idempotencyRepository)
    {
        _limits = options.Value.Limits;
        _tokenService = tokenService;
        _idempotencyRepository = idempotencyRepository;
    }

    #region Public Methods

    public async Task<T> RunAsync<T>(KhataCallerDto caller, Guid? idempotencyKey, string endpoint, object request, Func<Task<T>> action, CancellationToken cancellationToken)
    {
        if (idempotencyKey is null)
            return await action();

        var now = DateTime.UtcNow;
        var requestHash = _tokenService.Hash(endpoint + ":" + JsonSerializer.Serialize(request));
        await _idempotencyRepository.DeleteExpiredAsync(now, cancellationToken);

        var existing = await _idempotencyRepository.GetAsync(caller.UserId, idempotencyKey.Value, cancellationToken);
        if (existing is not null)
            return Replay<T>(existing, requestHash);

        var entry = new KhataIdempotencyKey { UserId = caller.UserId, IdempotencyKey = idempotencyKey.Value, Endpoint = endpoint, RequestHash = requestHash, ExpiresOn = now.AddHours(_limits.IdempotencyHours) };
        if (!await _idempotencyRepository.TryReserveAsync(entry, cancellationToken))
            return Replay<T>(await _idempotencyRepository.GetAsync(caller.UserId, idempotencyKey.Value, cancellationToken), requestHash);

        try
        {
            var result = await action();
            entry.ResponseStatus = CompletedStatus;
            entry.ResponseBody = JsonSerializer.Serialize(result);
            await _idempotencyRepository.SaveChangesAsync(cancellationToken);

            return result;
        }
        catch
        {
            await _idempotencyRepository.RemoveAsync(entry.Id, CancellationToken.None);
            throw;
        }
    }

    #endregion

    #region Private Methods

    private static T Replay<T>(KhataIdempotencyKey? entry, string requestHash)
    {
        if (entry is not null && entry.RequestHash != requestHash)
            throw new BusinessException(MessageCodes.KhataRequestKeyReused, 422);

        if (entry?.ResponseBody is null)
            throw new BusinessException(MessageCodes.KhataRequestInProgress, 409);

        return JsonSerializer.Deserialize<T>(entry.ResponseBody)!;
    }

    #endregion
}
