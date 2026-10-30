using Microsoft.Extensions.Options;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Khata;
using Thakurg.Contracts.Messages;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Services;

// Books (P9): a user's separate khatas, each with one money type that is fixed after its first entry (P10).
public class KhataBookService : IKhataBookService
{
    private const int MaxNameLength = 100;

    private readonly KhataLimitsOptions _limits;

    private readonly IKhataCommonServices _common;

    private readonly IKhataAuthRepository _authRepository;

    private readonly IKhataBookRepository _bookRepository;

    public KhataBookService(IOptions<KhataOptions> options, IKhataCommonServices common, IKhataAuthRepository authRepository, IKhataBookRepository bookRepository)
    {
        _limits = options.Value.Limits;
        _common = common;
        _authRepository = authRepository;
        _bookRepository = bookRepository;
    }

    #region Public Methods

    public async Task<List<BookDto>> GetAllAsync(KhataCallerDto caller, CancellationToken cancellationToken)
    {
        var user = await _authRepository.GetUserAsync(caller.UserId, cancellationToken);

        return await _bookRepository.GetBookSummariesAsync(caller.UserId, null, user?.LastBookId, cancellationToken);
    }

    public async Task<BookDto> OpenAsync(KhataCallerDto caller, int bookId, CancellationToken cancellationToken)
    {
        await RequireBookAsync(caller, bookId, cancellationToken);
        await _bookRepository.SetLastBookAsync(caller.UserId, bookId, cancellationToken);

        return await SummaryAsync(caller, bookId, bookId, cancellationToken);
    }

    public async Task<string> DeleteAsync(KhataCallerDto caller, int bookId, string? proof, CancellationToken cancellationToken)
    {
        var book = await RequireBookAsync(caller, bookId, cancellationToken);
        await _common.Pin.ConsumeProofAsync(caller, KhataPinPurpose.DeleteBook, bookId, proof, cancellationToken);

        book.IsSoftDeleted = true;
        book.ModifiedOn = DateTime.UtcNow;
        await _bookRepository.SaveChangesAsync(cancellationToken);
        await _common.Audit.WriteAsync(KhataAuditActions.BookDeleted, caller.UserId, caller, new { BookId = bookId, book.Name }, cancellationToken);

        return await _common.Messages.GetAsync(MessageCodes.KhataBookDeleted);
    }

    public async Task<BookDto> UpdateAsync(KhataCallerDto caller, int bookId, BookRequestDto request, CancellationToken cancellationToken)
    {
        var book = await RequireBookAsync(caller, bookId, cancellationToken);
        var name = await ValidateAsync(caller, request, bookId, cancellationToken);
        if (request.CurrencyId != book.CurrencyId && await _bookRepository.BookHasEntriesAsync(bookId, cancellationToken))
            throw new BusinessException(MessageCodes.KhataBookCurrencyLocked, 409);

        book.Name = name;
        book.CurrencyId = request.CurrencyId;
        book.ModifiedOn = DateTime.UtcNow;
        await _bookRepository.SaveChangesAsync(cancellationToken);

        return await SummaryAsync(caller, bookId, null, cancellationToken);
    }

    public async Task<BookDto> CreateAsync(KhataCallerDto caller, BookRequestDto request, Guid? idempotencyKey, CancellationToken cancellationToken)
    {
        return await _common.Idempotency.RunAsync(caller, idempotencyKey, "POST books", request, async () =>
        {
            var name = await ValidateAsync(caller, request, null, cancellationToken);
            if (await _bookRepository.CountBooksAsync(caller.UserId, cancellationToken) >= _limits.MaxBooks)
                throw new BusinessException(MessageCodes.KhataBookLimit, 409, _limits.MaxBooks);

            var book = new KhataBook { OwnerUserId = caller.UserId, Name = name, CurrencyId = request.CurrencyId };
            await _bookRepository.AddBookAsync(book, cancellationToken);
            await _bookRepository.SetLastBookAsync(caller.UserId, book.Id, cancellationToken);

            return await SummaryAsync(caller, book.Id, book.Id, cancellationToken);
        }, cancellationToken);
    }

    #endregion

    #region Private Methods

    private async Task<KhataBook> RequireBookAsync(KhataCallerDto caller, int bookId, CancellationToken cancellationToken)
    {
        return await _bookRepository.GetBookAsync(bookId, caller.UserId, cancellationToken) ?? throw new BusinessException(MessageCodes.KhataBookNotFound, 404);
    }

    private async Task<BookDto> SummaryAsync(KhataCallerDto caller, int bookId, int? lastBookId, CancellationToken cancellationToken)
    {
        var books = await _bookRepository.GetBookSummariesAsync(caller.UserId, bookId, lastBookId, cancellationToken);

        return books.FirstOrDefault() ?? throw new BusinessException(MessageCodes.KhataBookNotFound, 404);
    }

    private async Task<string> ValidateAsync(KhataCallerDto caller, BookRequestDto request, int? exceptBookId, CancellationToken cancellationToken)
    {
        var name = request.Name.Trim();
        if (name.Length is 0 or > MaxNameLength)
            throw new BusinessException(MessageCodes.KhataBookNameInvalid, 400, MaxNameLength);

        if (await _bookRepository.GetCurrencyAsync(request.CurrencyId, caller.UserId, cancellationToken) is null)
            throw new BusinessException(MessageCodes.KhataCurrencyNotFound, 404);

        if (await _bookRepository.BookNameExistsAsync(caller.UserId, name, exceptBookId, cancellationToken))
            throw new BusinessException(MessageCodes.KhataBookNameTaken, 409);

        return name;
    }

    #endregion
}
