using Microsoft.Extensions.Options;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Khata;
using Thakurg.Contracts.Messages;
using Thakurg.Domain.Entities;
using Thakurg.Infrastructure.Common;

namespace Thakurg.Infrastructure.Services;

// Money types (P10): the built-in list for everyone, plus each user's own types ("Gold (g)", 3 decimals).
public class KhataCurrencyService : IKhataCurrencyService
{
    private const int MaxDecimals = 3;

    private const int MaxCodeLength = 10;

    private const int MaxNameLength = 50;

    private readonly KhataLimitsOptions _limits;

    private readonly IKhataCommonServices _common;

    private readonly IKhataBookRepository _bookRepository;

    public KhataCurrencyService(IOptions<KhataOptions> options, IKhataCommonServices common, IKhataBookRepository bookRepository)
    {
        _limits = options.Value.Limits;
        _common = common;
        _bookRepository = bookRepository;
    }

    #region Public Methods

    public async Task<List<CurrencyDto>> GetAllAsync(KhataCallerDto caller, CancellationToken cancellationToken)
    {
        var currencies = await _bookRepository.GetCurrenciesAsync(caller.UserId, cancellationToken);

        return currencies.Select(KhataMapper.ToDto).ToList();
    }

    // Only the user's own type can be removed, and only while no book uses it.
    public async Task<string> DeleteAsync(KhataCallerDto caller, int currencyId, CancellationToken cancellationToken)
    {
        var currency = await RequireOwnAsync(caller, currencyId, cancellationToken);
        if (await _bookRepository.IsCurrencyUsedAsync(currencyId, cancellationToken))
            throw new BusinessException(MessageCodes.KhataCurrencyInUse, 409);

        currency.IsSoftDeleted = true;
        currency.ModifiedOn = DateTime.UtcNow;
        await _bookRepository.SaveChangesAsync(cancellationToken);
        await _common.Audit.WriteAsync(KhataAuditActions.CurrencyDeleted, caller.UserId, caller, new { currency.Code }, cancellationToken);

        return await _common.Messages.GetAsync(MessageCodes.KhataCurrencyDeleted);
    }

    public async Task<CurrencyDto> AddAsync(KhataCallerDto caller, CurrencyRequestDto request, CancellationToken cancellationToken)
    {
        var (code, symbol, name) = Validate(request);
        if (await _bookRepository.CountCustomCurrenciesAsync(caller.UserId, cancellationToken) >= _limits.MaxCustomCurrencies)
            throw new BusinessException(MessageCodes.KhataCurrencyLimit, 409, _limits.MaxCustomCurrencies);

        if (await _bookRepository.CurrencyCodeExistsAsync(caller.UserId, code, null, cancellationToken))
            throw new BusinessException(MessageCodes.KhataCurrencyCodeTaken, 409);

        var currency = new KhataCurrency { OwnerUserId = caller.UserId, Code = code, Symbol = symbol, Name = name, Decimals = request.Decimals };
        await _bookRepository.AddCurrencyAsync(currency, cancellationToken);

        return KhataMapper.ToDto(currency);
    }

    // Code and decimals decide how stored amounts are read, so they are fixed once a book uses the type; name and symbol can always change.
    public async Task<CurrencyDto> UpdateAsync(KhataCallerDto caller, int currencyId, CurrencyRequestDto request, CancellationToken cancellationToken)
    {
        var currency = await RequireOwnAsync(caller, currencyId, cancellationToken);
        var (code, symbol, name) = Validate(request);
        var changesMeaning = code != currency.Code || request.Decimals != currency.Decimals;
        if (changesMeaning && await _bookRepository.IsCurrencyUsedAsync(currencyId, cancellationToken))
            throw new BusinessException(MessageCodes.KhataCurrencyInUse, 409);

        if (code != currency.Code && await _bookRepository.CurrencyCodeExistsAsync(caller.UserId, code, currencyId, cancellationToken))
            throw new BusinessException(MessageCodes.KhataCurrencyCodeTaken, 409);

        currency.Code = code;
        currency.Symbol = symbol;
        currency.Name = name;
        currency.Decimals = request.Decimals;
        currency.ModifiedOn = DateTime.UtcNow;
        await _bookRepository.SaveChangesAsync(cancellationToken);

        return KhataMapper.ToDto(currency);
    }

    #endregion

    #region Private Methods

    private static (string Code, string Symbol, string Name) Validate(CurrencyRequestDto request)
    {
        var code = request.Code.Trim().ToUpperInvariant();
        var symbol = request.Symbol.Trim();
        var name = request.Name.Trim();
        if (code.Length is 0 or > MaxCodeLength || symbol.Length is 0 or > MaxCodeLength || name.Length is 0 or > MaxNameLength || request.Decimals > MaxDecimals)
            throw new BusinessException(MessageCodes.KhataCurrencyInvalid, 400);

        return (code, symbol, name);
    }

    private async Task<KhataCurrency> RequireOwnAsync(KhataCallerDto caller, int currencyId, CancellationToken cancellationToken)
    {
        var currency = await _bookRepository.GetCurrencyAsync(currencyId, caller.UserId, cancellationToken);

        return currency is { OwnerUserId: not null } ? currency : throw new BusinessException(MessageCodes.KhataCurrencyNotFound, 404);
    }

    #endregion
}
