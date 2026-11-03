using System.Globalization;
using Microsoft.Extensions.Options;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Export;
using Thakurg.Contracts.Khata;
using Thakurg.Contracts.Messages;
using Thakurg.Infrastructure.Common;

namespace Thakurg.Infrastructure.Services;

// Downloads of a book's entries, one party's statement and a book's parties as PDF, CSV or Excel. The entry lists take the same filters as the screens (kind, from, to, q, sort),
// across all pages up to Khata:Limits:MaxExportRows. Titles and headings are in the request's language (Accept-Language); Arabic is laid out right-to-left.
public class KhataExportService : IKhataExportService
{
    private readonly KhataLimitsOptions _limits;

    private const string DateFormat = "dd-MM-yyyy";

    private readonly IExportService _exportService;

    private readonly IMessageService _messageService;

    private readonly IKhataBookRepository _bookRepository;

    private readonly IKhataContactRepository _contactRepository;

    private readonly IKhataTransactionRepository _transactionRepository;

    private static readonly Dictionary<string, ExportFormat> Formats = new(StringComparer.OrdinalIgnoreCase) { ["pdf"] = ExportFormat.Pdf, ["csv"] = ExportFormat.Csv, ["xlsx"] = ExportFormat.Xlsx };

    public KhataExportService(IOptions<KhataOptions> options, IExportService exportService, IMessageService messageService, IKhataBookRepository bookRepository,
        IKhataContactRepository contactRepository, IKhataTransactionRepository transactionRepository)
    {
        _limits = options.Value.Limits;
        _exportService = exportService;
        _messageService = messageService;
        _bookRepository = bookRepository;
        _contactRepository = contactRepository;
        _transactionRepository = transactionRepository;
    }

    #region Public Methods

    // Party, type, mobile, e-mail, balance (above 0 = you will get) and the date of the last entry.
    public async Task<ExportFileDto> ExportContactsAsync(KhataCallerDto caller, int bookId, string? format, CancellationToken cancellationToken)
    {
        var exportFormat = Format(format);
        var book = await RequireBookAsync(caller, bookId, cancellationToken);
        var contacts = await _contactRepository.GetContactsAsync(bookId, cancellationToken);
        var customer = await Label(MessageCodes.KhataExportCustomer);
        var supplier = await Label(MessageCodes.KhataExportSupplier);
        var table = NewTable(book, await Label(MessageCodes.KhataExportPartiesTitle, book.Name), "parties", book.Name, [await Created()]);
        table.Columns = [await Column(MessageCodes.KhataExportParty, ExportCellKind.Text), await Column(MessageCodes.KhataExportType, ExportCellKind.Text), await Column(MessageCodes.KhataExportMobile, ExportCellKind.Text), await Column(MessageCodes.KhataExportEmail, ExportCellKind.Text), await Column(MessageCodes.KhataExportBalance, ExportCellKind.Money), await Column(MessageCodes.KhataExportLastEntry, ExportCellKind.Date)];
        table.Rows = contacts.Take(_limits.MaxExportRows).Select(c => new List<object?> { c.Contact.Name, c.Contact.ContactType == (byte)KhataContactType.Supplier ? supplier : customer, c.Contact.Mobile, c.Contact.Email, Money(c.Contact.BalanceMinor, book), c.LastEntryOn }).ToList();
        table.Totals = [await Label(MessageCodes.KhataExportTotal), null, null, null, Money(contacts.Sum(c => c.Contact.BalanceMinor), book), null];

        return _exportService.Export(table, exportFormat);
    }

    // Date, party, type, note, gave, got and status of every matching entry of the book; the totals count live entries only.
    public async Task<ExportFileDto> ExportBookEntriesAsync(KhataCallerDto caller, int bookId, TransactionQueryDto query, string? format, CancellationToken cancellationToken)
    {
        var exportFormat = Format(format);
        var book = await RequireBookAsync(caller, bookId, cancellationToken);
        var filter = Filter(query);
        filter.BookId = bookId;
        filter.SearchContactName = true;
        var (items, _, gaveMinor, gotMinor) = await _transactionRepository.GetPageAsync(filter, caller.UserId, cancellationToken);
        var labels = await EntryLabelsAsync();
        var table = NewTable(book, await Label(MessageCodes.KhataExportEntriesTitle, book.Name), "entries", book.Name, [await Period(filter), await Created()]);
        table.Columns = [await Column(MessageCodes.KhataExportDate, ExportCellKind.Date), await Column(MessageCodes.KhataExportParty, ExportCellKind.Text), await Column(MessageCodes.KhataExportType, ExportCellKind.Text), await Column(MessageCodes.KhataExportNote, ExportCellKind.Text), await Column(MessageCodes.KhataExportGave, ExportCellKind.Money), await Column(MessageCodes.KhataExportGot, ExportCellKind.Money), await Column(MessageCodes.KhataExportStatus, ExportCellKind.Text)];
        table.Rows = items.Select(t => new List<object?> { t.EntryDate, t.ContactName, Type(t, labels), t.Note, Gave(t, book), Got(t, book), Status(t, labels) }).ToList();
        table.Totals = [labels.Total, null, null, null, Money(gaveMinor, book), Money(gotMinor, book), null];

        return _exportService.Export(table, exportFormat);
    }

    // One party's statement: their mobile and balance in the header, then date, type, note, gave, got, the balance after each entry and status.
    public async Task<ExportFileDto> ExportContactEntriesAsync(KhataCallerDto caller, int contactId, TransactionQueryDto query, string? format, CancellationToken cancellationToken)
    {
        var exportFormat = Format(format);
        var contact = await _contactRepository.GetContactAsync(contactId, caller.UserId, cancellationToken) ?? throw new BusinessException(MessageCodes.KhataContactNotFound, 404);
        var book = await RequireBookAsync(caller, contact.BookId, cancellationToken);
        var filter = Filter(query);
        filter.ContactId = contactId;
        var (items, _, gaveMinor, gotMinor) = await _transactionRepository.GetPageAsync(filter, caller.UserId, cancellationToken);
        var labels = await EntryLabelsAsync();
        var subtitles = new List<string>();

        if (contact.Mobile is not null)
            subtitles.Add(await Label(MessageCodes.KhataExportMobileLine, contact.Mobile));

        subtitles.AddRange([await Label(MessageCodes.KhataExportBalanceLine, KhataMoney.Format(contact.BalanceMinor, book.Currency.Symbol, book.Currency.Decimals)), await Period(filter), await Created()]);
        var table = NewTable(book, await Label(MessageCodes.KhataExportStatementTitle, contact.Name), "statement", contact.Name, subtitles);
        table.Columns = [await Column(MessageCodes.KhataExportDate, ExportCellKind.Date), await Column(MessageCodes.KhataExportType, ExportCellKind.Text), await Column(MessageCodes.KhataExportNote, ExportCellKind.Text), await Column(MessageCodes.KhataExportGave, ExportCellKind.Money), await Column(MessageCodes.KhataExportGot, ExportCellKind.Money), await Column(MessageCodes.KhataExportBalanceAfter, ExportCellKind.Money), await Column(MessageCodes.KhataExportStatus, ExportCellKind.Text)];
        table.Rows = items.Select(t => new List<object?> { t.EntryDate, Type(t, labels), t.Note, Gave(t, book), Got(t, book), t.BalanceAfterMinor is long after ? Money(after, book) : null, Status(t, labels) }).ToList();
        table.Totals = [labels.Total, null, null, Money(gaveMinor, book), Money(gotMinor, book), null, null];

        return _exportService.Export(table, exportFormat);
    }

    #endregion

    #region Private Methods

    private async Task<string> Created()
    {
        return await Label(MessageCodes.KhataExportCreated, DateTime.UtcNow.ToString(DateFormat + " HH:mm", CultureInfo.InvariantCulture));
    }

    private static ExportFormat Format(string? format)
    {
        return Formats.TryGetValue((format ?? string.Empty).Trim(), out var exportFormat) ? exportFormat : throw new BusinessException(MessageCodes.ExportFormatInvalid, 400);
    }

    private async Task<KhataExportLabels> EntryLabelsAsync()
    {
        return new KhataExportLabels(await Label(MessageCodes.KhataExportGave), await Label(MessageCodes.KhataExportGot), await Label(MessageCodes.KhataExportActive), await Label(MessageCodes.KhataExportDeleted), await Label(MessageCodes.KhataExportTotal));
    }

    private static decimal Money(long amountMinor, BookDto book)
    {
        return KhataMoney.ToMajor(amountMinor, book.Currency.Decimals);
    }

    private TransactionFilterDto Filter(TransactionQueryDto query)
    {
        var filter = KhataQuery.Filter(query, _limits);
        filter.Page = 1;
        filter.PageSize = _limits.MaxExportRows;

        return filter;
    }

    private async Task<string> Period(TransactionFilterDto filter)
    {
        if (filter.From is null && filter.To is null)
            return await Label(MessageCodes.KhataExportAllDates);

        return await Label(MessageCodes.KhataExportPeriod, filter.From?.ToString(DateFormat, CultureInfo.InvariantCulture) ?? "…", filter.To?.ToString(DateFormat, CultureInfo.InvariantCulture) ?? "…");
    }

    private static decimal? Got(TransactionDto entry, BookDto book)
    {
        return entry.EntryType == KhataEntryType.Got ? Money(entry.AmountMinor, book) : null;
    }

    private static decimal? Gave(TransactionDto entry, BookDto book)
    {
        return entry.EntryType == KhataEntryType.Gave ? Money(entry.AmountMinor, book) : null;
    }

    private Task<string> Label(string code, params object[] arguments)
    {
        return _messageService.GetAsync(code, arguments);
    }

    // Money columns end-aligned; everything else starts at the reading edge.
    private async Task<ExportColumn> Column(string code, ExportCellKind kind)
    {
        return new ExportColumn { Header = await Label(code), Kind = kind, Align = kind == ExportCellKind.Text ? ExportAlign.Start : kind == ExportCellKind.Date ? ExportAlign.Center : ExportAlign.End };
    }

    private static string Type(TransactionDto entry, KhataExportLabels labels)
    {
        return entry.EntryType == KhataEntryType.Gave ? labels.Gave : labels.Got;
    }

    private static string Status(TransactionDto entry, KhataExportLabels labels)
    {
        return entry.IsDeleted ? labels.Deleted : labels.Active;
    }

    // The download name is kind-name-date; the name keeps letters, digits and marks of any script (the controller adds an ASCII-only fallback).
    private ExportTable NewTable(BookDto book, string title, string kind, string name, List<string> subtitles)
    {
        var words = new string(name.Select(c => char.IsLetterOrDigit(c) || char.GetUnicodeCategory(c) is UnicodeCategory.NonSpacingMark or UnicodeCategory.SpacingCombiningMark ? c : ' ').ToArray()).Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var fileName = string.Join("-", [kind, .. words, DateTime.UtcNow.ToString("yyyyMMdd", CultureInfo.InvariantCulture)]);

        return new ExportTable { Title = title, Subtitles = subtitles, FileName = fileName, MoneyDecimals = book.Currency.Decimals, RightToLeft = _messageService.CurrentLanguage() == "ar" };
    }

    private async Task<BookDto> RequireBookAsync(KhataCallerDto caller, int bookId, CancellationToken cancellationToken)
    {
        var books = await _bookRepository.GetBookSummariesAsync(caller.UserId, bookId, null, cancellationToken);

        return books.FirstOrDefault() ?? throw new BusinessException(MessageCodes.KhataBookNotFound, 404);
    }

    #endregion
}
