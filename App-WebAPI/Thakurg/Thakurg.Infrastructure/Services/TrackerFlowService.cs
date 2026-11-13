using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Tracker;
using Thakurg.Contracts.Wrappers;
using Thakurg.Domain.Entities;
using Thakurg.Infrastructure.Common;

namespace Thakurg.Infrastructure.Services;

// What each SnapTracker transaction counts towards (TrackerFlows). ReflowAsync works it out again for all of a user's transactions after every change, so an
// SMS that arrives later can still pair with an earlier one: the reader's flow of each SMS (TrackerSmsReader.Flow), the user's own rules, then
// - accounts and cards: every account number seen; one seen on a card becomes a card, and a plain "Spent … Card 6124" on it is a card purchase;
// - loans: a debit within Tracker:Limits:EmiTolerancePercent of a loan's EMI (from its reminders, or one the user marked) is that EMI;
// - an outgoing NEFT confirmation ("credited to the beneficiary account") next to the debit of the same amount is an echo of it (duplicate);
// - self transfers: both sides of the same UPI reference, a salary moved on to another of the user's accounts the same day, and money in that names nobody
//   from Tracker:Limits:UnnamedSelfMinor up;
// - card bills: a card's "payment received" and a bank debit of the same amount within Tracker:Limits:CardBillDays.
// A flow the user chose (FlowEdited) and a category the user chose (IsEdited) are never changed.
public class TrackerFlowService : ITrackerFlowService
{
    private readonly TrackerOptions _options;

    private readonly ITrackerSmsReader _reader;

    private readonly ITrackerRepository _repository;

    private readonly IMessageService _messageService;

    private readonly ITrackerService _trackerService;

    private readonly ITrackerSecretProtector _protector;

    private static readonly string[] CardFlows = [TrackerFlows.CardSpend, TrackerFlows.CardRefund, TrackerFlows.CardPaymentIn];

    private static readonly Regex OwnNameRegex = new(@"^[\p{L}][\p{L} .'-]*$", RegexOptions.CultureInvariant);

    private static readonly Regex LoanNumberRegex = new(@"\bloan\s*(?:no\.?\s*)?[x*]*(\d{3,6})\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    public TrackerFlowService(ITrackerRepository repository, ITrackerSmsReader reader, ITrackerSecretProtector protector, ITrackerService trackerService, IMessageService messageService, IOptions<TrackerOptions> options)
    {
        _repository = repository;
        _reader = reader;
        _protector = protector;
        _trackerService = trackerService;
        _messageService = messageService;
        _options = options.Value;
    }

    #region Public Methods

    public async Task ReflowAsync(TrackerUser user, CancellationToken cancellationToken)
    {
        var owner = TrackerMapper.Owner(user);
        var limits = _options.Limits;
        var allRules = await _repository.GetRulesAsync(user.Id, cancellationToken);
        var flowRules = allRules.Where(r => r.FlowCode is not null).ToDictionary(r => r.MerchantKey, r => r.FlowCode!);
        var categoryRules = allRules.Where(r => r.CategoryCode is not null).ToDictionary(r => r.MerchantKey, r => r.CategoryCode!);
        var accounts = await _repository.GetAccountsAsync(user.Id, cancellationToken);
        var items = (await _repository.GetTransactionsAsync(user.Id, cancellationToken)).OrderBy(t => t.OccurredOn).ThenBy(t => t.Id).Select(t => Read(t, owner, flowRules)).ToList();

        foreach (var item in items)
            item.T.PairId = null;

        await LinkAccountsAsync(user, items, accounts, cancellationToken);
        var cards = accounts.Where(a => a.AccountType == TrackerAccountTypes.Card).Select(a => a.Last4).ToHashSet();

        foreach (var item in items.Where(i => i.Free && i.Flow == TrackerFlows.Spend && i.Body is not null && Regex.IsMatch(i.Body, @"\bcard\b", RegexOptions.IgnoreCase)))
            if (AccountDigits(item) is { } last4 && cards.Contains(last4))
                item.Flow = TrackerFlows.CardSpend;

        await LinkLoansAsync(user, items, accounts, cancellationToken);
        MarkEchoes(items);
        var counted = items.Where(i => i.T.Status is not (TrackerStatuses.Ignored or TrackerStatuses.Duplicate)).ToList();
        PairSelfTransfers(counted, limits);
        PairCardBills(counted, limits);

        foreach (var item in items)
        {
            if (!item.T.FlowEdited)
                item.T.FlowCode = item.Flow;

            if (!item.T.IsEdited)
                item.T.CategoryCode = Category(item, categoryRules);
        }

        await _repository.SaveChangesAsync(cancellationToken);
    }

    // A reminder or statement: the loan's EMI and next due date, or the card's statement total and due date, kept on that account.
    public async Task RecordDueAsync(TrackerUser user, TrackerDueDto due, string provider, CancellationToken cancellationToken)
    {
        var accounts = await _repository.GetAccountsAsync(user.Id, cancellationToken);
        var account = accounts.FirstOrDefault(a => a.AccountType == due.AccountType && a.Last4 == due.Last4) ?? accounts.FirstOrDefault(a => due.AccountType == TrackerAccountTypes.Card && a.AccountType == TrackerAccountTypes.Bank && a.Last4 == due.Last4);

        if (account is null)
        {
            account = new TrackerAccount { TrackerUserId = user.Id, AccountType = due.AccountType, Last4 = due.Last4, Provider = provider };
            _repository.AddAccount(account);
        }

        account.AccountType = due.AccountType;
        account.StatementDueOn = due.DueOn;
        var minor = (long)Math.Round(due.Amount * 100);

        if (due.AccountType == TrackerAccountTypes.Loan)
            account.EmiMinor = minor;
        else
            account.StatementTotalMinor = minor;

        await _repository.SaveChangesAsync(cancellationToken);
    }

    // The user's names as banks write them and their mobile numbers; every transaction is worked out again with them.
    public async Task<ServiceResultDto<TrackerDataDto>> SaveOwnerAsync(TrackerCallerDto caller, TrackerOwnerDto request, CancellationToken cancellationToken)
    {
        var limits = _options.Limits;
        var names = request.Names.Select(n => Regex.Replace(n ?? string.Empty, @"\s+", " ").Trim()).Where(n => n.Length > 0).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var mobiles = request.Mobiles.Select(m => Regex.Replace(m ?? string.Empty, @"[\s\-+()]", string.Empty)).Where(m => m.Length > 0).Distinct().ToList();

        if (names.Count > limits.OwnEntries || mobiles.Count > limits.OwnEntries || names.Any(n => n.Length > limits.OwnNameLength || !OwnNameRegex.IsMatch(n)) || mobiles.Any(m => !Regex.IsMatch(m, @"^\d{10,13}$")))
            throw new BusinessException(MessageCodes.TrackerInvalid, 400);

        var user = await UserAsync(caller, cancellationToken);
        user.OwnNames = string.Join(',', names);
        user.OwnMobiles = string.Join(',', mobiles);
        await _repository.SaveChangesAsync(cancellationToken);
        await ReflowAsync(user, cancellationToken);

        return await ResultAsync(caller, MessageCodes.TrackerDetailsSaved, cancellationToken);
    }

    // "Mark as…". Remember: the merchant's other transactions count the same (a rule); an EMI without a merchant becomes a loan of this amount instead.
    public async Task<ServiceResultDto<TrackerDataDto>> SetFlowAsync(TrackerCallerDto caller, int id, TrackerFlowRequestDto request, CancellationToken cancellationToken)
    {
        if (!TrackerFlows.All.Contains(request.Flow))
            throw new BusinessException(MessageCodes.TrackerInvalid, 400);

        var user = await UserAsync(caller, cancellationToken);
        var transaction = await _repository.GetTransactionAsync(user.Id, id, cancellationToken) ?? throw new BusinessException(MessageCodes.TrackerNotFound, 404);
        transaction.FlowCode = request.Flow;
        transaction.FlowEdited = true;
        var code = MessageCodes.TrackerFlowSaved;

        if (request.Remember && transaction.Merchant is not null)
        {
            var key = transaction.Merchant.ToLowerInvariant();
            var rule = (await _repository.GetRulesAsync(user.Id, cancellationToken)).FirstOrDefault(r => r.MerchantKey == key);

            if (rule is null)
                _repository.AddRule(new TrackerCategoryRule { TrackerUserId = user.Id, MerchantKey = key, FlowCode = request.Flow });
            else
                rule.FlowCode = request.Flow;

            code = MessageCodes.TrackerFlowRule;
        }
        else if (request.Remember && request.Flow == TrackerFlows.Emi)
        {
            var last4 = Math.Round(transaction.AmountMinor / 100m).ToString(System.Globalization.CultureInfo.InvariantCulture);
            last4 = last4[..Math.Min(8, last4.Length)];
            var accounts = await _repository.GetAccountsAsync(user.Id, cancellationToken);

            if (!accounts.Any(a => a.AccountType == TrackerAccountTypes.Loan && a.Last4 == last4))
                _repository.AddAccount(new TrackerAccount { TrackerUserId = user.Id, AccountType = TrackerAccountTypes.Loan, Last4 = last4, Provider = transaction.SmsText?.SenderName ?? string.Empty, EmiMinor = transaction.AmountMinor });

            code = MessageCodes.TrackerFlowRule;
        }

        await _repository.SaveChangesAsync(cancellationToken);
        await ReflowAsync(user, cancellationToken);

        return await ResultAsync(caller, code, cancellationToken, transaction.Merchant ?? string.Empty);
    }

    public async Task<ServiceResultDto<TrackerDataDto>> SetAccountLabelAsync(TrackerCallerDto caller, int id, TrackerAccountRequestDto request, CancellationToken cancellationToken)
    {
        var label = request.Label?.Trim();

        if (label is { Length: > 0 } && label.Length > _options.Limits.OwnNameLength)
            throw new BusinessException(MessageCodes.TrackerInvalid, 400);

        var account = (await _repository.GetAccountsAsync(caller.UserId, cancellationToken)).FirstOrDefault(a => a.Id == id) ?? throw new BusinessException(MessageCodes.TrackerNotFound, 404);
        account.Label = string.IsNullOrEmpty(label) ? null : label;
        await _repository.SaveChangesAsync(cancellationToken);

        return await ResultAsync(caller, MessageCodes.TrackerAccountSaved, cancellationToken);
    }

    #endregion

    #region Private Methods

    private string? Body(TrackerSmsText sms)
    {
        try
        {
            return _protector.Unprotect(sms.BodyProtected);
        }
        catch (System.Security.Cryptography.CryptographicException)
        {
            return null;
        }
    }

    private static string Last4(string number)
    {
        var digits = new string(number.Where(char.IsDigit).ToArray());

        return digits[^Math.Min(4, digits.Length)..];
    }

    private static double Hours(Item a, Item b)
    {
        return Math.Abs((a.T.OccurredOn - b.T.OccurredOn).TotalHours);
    }

    private static string? AccountDigits(Item item)
    {
        return item.T.AccountLast4 is { } account ? Last4(account) : null;
    }

    // An outgoing NEFT confirmation next to the debit of the same amount (within a day) only repeats that debit.
    private static void MarkEchoes(List<Item> items)
    {
        foreach (var item in items.Where(i => i.Body is not null && i.Body.Contains("credited to the beneficiary account", StringComparison.OrdinalIgnoreCase) && !i.T.IsEdited))
        {
            var debit = items.FirstOrDefault(o => o != item && o.T.Type == TrackerTypes.Debit && o.T.AmountMinor == item.T.AmountMinor && Hours(o, item) < 24 && o.T.Status != TrackerStatuses.Duplicate && (o.Body is null || !o.Body.Contains("beneficiary", StringComparison.OrdinalIgnoreCase)));

            if (debit is null)
                continue;

            item.T.Status = TrackerStatuses.Duplicate;
            item.T.DuplicateOfId = debit.T.Id;
            item.T.DuplicateReason = "echo";
        }
    }

    // The category that goes with the flow: EMI, salary, a transfer (self, card bill, the card's payment, money borrowed) or a refund; a spend or income
    // keeps its category, or gets it again from the SMS when it carried a flow's category before.
    private string Category(Item item, Dictionary<string, string> rules)
    {
        return item.Flow switch
        {
            TrackerFlows.Emi => "emi",
            TrackerFlows.Salary => "salary",
            TrackerFlows.SelfTransfer or TrackerFlows.CardBillPaid or TrackerFlows.CardPaymentIn or TrackerFlows.LoanIn => "transfer",
            TrackerFlows.Refund or TrackerFlows.CardRefund => "refund",
            _ when item.T.CategoryCode is "emi" or "salary" or "transfer" or "refund" && item.Parsed is not null => _reader.Categorize(item.Parsed, item.Body!, rules),
            _ => item.T.CategoryCode,
        };
    }

    // Two sides of one movement: each points at the other, and takes its flow unless the user chose one.
    private static void Pair(Item a, Item b, string flowA, string flowB)
    {
        if (a.Free)
            a.Flow = flowA;

        if (b.Free)
            b.Flow = flowB;

        a.T.PairId = b.T.Id;
        b.T.PairId = a.T.Id;
    }

    // A card's "payment received" and the bank debit of the same amount within CardBillDays (paid through CRED, slice, a bank app…): the debit is the bill.
    private static void PairCardBills(List<Item> counted, TrackerLimitsOptions limits)
    {
        foreach (var item in counted.Where(i => i.Flow == TrackerFlows.CardPaymentIn && i.T.PairId is null))
        {
            var bill = counted.Where(o => o.T.Type == TrackerTypes.Debit && o.T.PairId is null && o.Flow is TrackerFlows.CardBillPaid or TrackerFlows.Spend && o.T.AmountMinor == item.T.AmountMinor && Hours(o, item) <= limits.CardBillDays * 24).MinBy(o => Hours(o, item));

            if (bill is not null)
                Pair(bill, item, TrackerFlows.CardBillPaid, TrackerFlows.CardPaymentIn);
        }
    }

    // Both sides of the same UPI reference when one of them is the user's own; a salary moved on to another account of the user within PairHours (the NEFT
    // out and the credit are both a self transfer); money in that names nobody, from UnnamedSelfMinor up.
    private static void PairSelfTransfers(List<Item> counted, TrackerLimitsOptions limits)
    {
        foreach (var item in counted.Where(i => i.T.Reference is not null && i.T.PairId is null))
        {
            var other = counted.FirstOrDefault(o => o != item && o.T.PairId is null && o.T.Reference == item.T.Reference && o.T.Type != item.T.Type);

            if (other is not null && (item.Flow == TrackerFlows.SelfTransfer || other.Flow == TrackerFlows.SelfTransfer))
                Pair(item, other, TrackerFlows.SelfTransfer, TrackerFlows.SelfTransfer);
        }

        foreach (var item in counted.Where(i => i.Flow == TrackerFlows.Salary && i.T.PairId is null))
        {
            var debit = counted.Where(o => o.T.Type == TrackerTypes.Debit && o.T.PairId is null && o.Flow is TrackerFlows.Spend or TrackerFlows.SelfTransfer && o.T.AmountMinor == item.T.AmountMinor && Hours(o, item) <= limits.PairHours).MinBy(o => Hours(o, item));

            if (debit is not null)
                Pair(item, debit, TrackerFlows.SelfTransfer, TrackerFlows.SelfTransfer);
        }

        foreach (var item in counted.Where(i => i.Free && i.Flow == TrackerFlows.Income && i.T.Merchant is null && i.T.AmountMinor >= limits.UnnamedSelfMinor))
            item.Flow = TrackerFlows.SelfTransfer;
    }

    // The flow of one transaction: the one the user chose, the reader's for an SMS (then the user's rule for its merchant), or from the type for one typed in.
    private Item Read(TrackerTransaction t, TrackerOwnerDto owner, Dictionary<string, string> rules)
    {
        var body = t.SmsText is { } sms ? Body(sms) : null;
        var parsed = body is null ? null : _reader.Parse(body, t.SmsText!.ReceivedOn);
        var flow = t.FlowEdited || parsed is null ? (t.FlowCode.Length > 0 ? t.FlowCode : t.Type == TrackerTypes.Credit ? (t.CategoryCode == "salary" ? TrackerFlows.Salary : TrackerFlows.Income) : t.Method == TrackerMethods.CreditCard ? TrackerFlows.CardSpend : TrackerFlows.Spend) : _reader.Flow(parsed, body!, owner);

        if (!t.FlowEdited && t.Merchant is not null && rules.TryGetValue(t.Merchant.ToLowerInvariant(), out var chosen))
            flow = chosen;

        return new Item(t, body, parsed) { Flow = flow };
    }

    private async Task<TrackerUser> UserAsync(TrackerCallerDto caller, CancellationToken cancellationToken)
    {
        return await _repository.GetUserAsync(caller.UserId, cancellationToken) ?? throw new BusinessException(MessageCodes.AuthSessionInvalid, 401);
    }

    // An EMI SMS that names its loan ("Insta Jumbo Loan XX0126 … Total Rs.14,772.82") makes or updates that loan; a debit within EmiTolerancePercent of a
    // loan's EMI is that EMI.
    private async Task LinkLoansAsync(TrackerUser user, List<Item> items, List<TrackerAccount> accounts, CancellationToken cancellationToken)
    {
        foreach (var item in items.Where(i => i.Flow == TrackerFlows.Emi && i.Body is not null && LoanNumberRegex.IsMatch(i.Body)))
        {
            var last4 = Last4(LoanNumberRegex.Match(item.Body!).Groups[1].Value);
            var loan = accounts.FirstOrDefault(a => a.AccountType == TrackerAccountTypes.Loan && a.Last4 == last4);

            if (loan is null)
            {
                loan = new TrackerAccount { TrackerUserId = user.Id, AccountType = TrackerAccountTypes.Loan, Last4 = last4, Provider = item.T.SmsText?.SenderName ?? string.Empty };
                accounts.Add(loan);
                _repository.AddAccount(loan);
            }

            loan.EmiMinor = item.T.AmountMinor;
            item.Loan = loan;
        }

        await _repository.SaveChangesAsync(cancellationToken);
        var loans = accounts.Where(a => a.AccountType == TrackerAccountTypes.Loan && a.EmiMinor is > 0).ToList();
        var tolerance = _options.Limits.EmiTolerancePercent / 100m;

        foreach (var item in items)
        {
            var loan = item.Loan ?? (item.T.Type == TrackerTypes.Debit && item.Flow is TrackerFlows.Spend or TrackerFlows.Emi ? loans.FirstOrDefault(l => Math.Abs(l.EmiMinor!.Value - item.T.AmountMinor) <= l.EmiMinor.Value * tolerance) : null);

            if (loan is not null && item.Free)
                item.Flow = TrackerFlows.Emi;

            item.T.LoanId = item.Flow == TrackerFlows.Emi ? loan?.Id : null;
        }
    }

    // Every account number in the SMS becomes a bank account or a card of the user (a number seen on a card is a card); each transaction points at its own.
    private async Task LinkAccountsAsync(TrackerUser user, List<Item> items, List<TrackerAccount> accounts, CancellationToken cancellationToken)
    {
        foreach (var item in items.Where(i => i.T.AccountLast4 is not null))
        {
            var last4 = Last4(item.T.AccountLast4!);
            var type = CardFlows.Contains(item.Flow) ? TrackerAccountTypes.Card : TrackerAccountTypes.Bank;
            var account = accounts.FirstOrDefault(a => a.AccountType != TrackerAccountTypes.Loan && a.Last4 == last4);

            if (last4.Length < 3)
                continue;

            if (account is null)
            {
                account = new TrackerAccount { TrackerUserId = user.Id, AccountType = type, Last4 = last4, Provider = item.T.SmsText?.SenderName ?? string.Empty };
                accounts.Add(account);
                _repository.AddAccount(account);
            }
            else if (type == TrackerAccountTypes.Card)
            {
                account.AccountType = TrackerAccountTypes.Card;
            }
        }

        await _repository.SaveChangesAsync(cancellationToken);

        foreach (var item in items)
            item.T.AccountId = item.T.AccountLast4 is { } number ? accounts.FirstOrDefault(a => a.AccountType != TrackerAccountTypes.Loan && a.Last4 == Last4(number))?.Id : null;
    }

    private async Task<ServiceResultDto<TrackerDataDto>> ResultAsync(TrackerCallerDto caller, string code, CancellationToken cancellationToken, params object[] arguments)
    {
        return new ServiceResultDto<TrackerDataDto> { Message = await _messageService.GetAsync(code, arguments), Data = await _trackerService.GetStateAsync(caller, cancellationToken) };
    }

    #endregion

    // One transaction while its flow is worked out: the decrypted SMS and what the reader found in it (null for one typed in or a deleted text).
    private sealed class Item(TrackerTransaction t, string? body, TrackerParsedSmsDto? parsed)
    {
        public TrackerAccount? Loan { get; set; }

        public string Flow { get; set; } = string.Empty;

        public string? Body { get; } = body;

        public TrackerTransaction T { get; } = t;

        public TrackerParsedSmsDto? Parsed { get; } = parsed;

        public bool Free => !T.FlowEdited;
    }
}
