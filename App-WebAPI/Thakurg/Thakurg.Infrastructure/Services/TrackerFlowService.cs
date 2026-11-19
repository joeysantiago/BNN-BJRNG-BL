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

// What each Tracker transaction counts towards (TrackerFlows). ReflowAsync works it out again for all of a user's transactions after every change, so an
// SMS that arrives later can still pair with an earlier one: the reader's flow of each SMS (TrackerSmsReader.Flow), the user's own rules, then
// - accounts and cards: every account number seen; one seen on a card becomes a card, and a plain "Spent … Card 6124" on it is a card purchase;
// - loans: a debit within Tracker:Limits:EmiTolerancePercent of a loan's EMI (from its reminders, or one the user marked) is that EMI;
// - an outgoing NEFT confirmation ("credited to the beneficiary account") next to the debit of the same amount is an echo of it (duplicate);
// - self transfers: both sides of the same UPI reference, a salary moved on to another of the user's accounts the same day, and money in that names nobody
//   from Tracker:Limits:UnnamedSelfMinor up;
// - card bills: a card's "payment received" and a bank debit of the same amount within Tracker:Limits:CardBillDays;
// - merchant confirmations: a merchant's own "payment received" SMS (Tracker:MerchantSenders) and the bank's debit of exactly that amount within
//   Tracker:Limits:ConfirmDays that pays that merchant (or names no one): the debit takes the merchant's name and category and is surer;
// - recurring payments: the same amount about every month (Tracker:Limits:RecurringMinMonths, RecurringDayWindow) is an EMI series with its loan, or a
//   recurring subscription or bill at a known merchant;
// - refunds: a credit from a merchant within Tracker:Limits:RefundDays of a larger or equal debit to it.
// A flow the user chose (FlowEdited) and a category the user chose (IsEdited) are never changed.
public class TrackerFlowService : ITrackerFlowService
{
    // How much surer a transaction is once a merchant's own SMS confirmed it.
    private const int ConfirmedPoints = 15;

    private readonly TrackerOptions _options;

    // Why a card's payment told a second time is a duplicate (tracker.dup.cardEcho).
    private const string CardEcho = "cardEcho";

    private readonly ITrackerSmsReader _reader;

    private readonly ITrackerRepository _repository;

    private readonly IMessageService _messageService;

    private readonly ITrackerService _trackerService;

    private readonly ITrackerSecretProtector _protector;

    private static readonly string[] CardFlows = [TrackerFlows.CardSpend, TrackerFlows.CardRefund, TrackerFlows.CardPaymentIn];

    private static readonly Regex OwnNameRegex = new(@"^[\p{L}][\p{L} .'-]*$", RegexOptions.CultureInvariant);

    private static readonly Regex LoanNumberRegex = new(@"\bloan\s*(?:no\.?\s*)?[x*]*(\d{3,6})\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    // A payee that is only the app, gateway or bill-payment service the money went through, not the merchant it paid.
    private static readonly Regex GatewayRegex = new(@"^(?:amazon ?pay|paytm|phone ?pe|google ?pay|gpay|bill ?desk|razorpay|payu|cc ?avenue|cashfree|juspay|bbps|bharat bill|bill ?pay(?:ment)?|recharge|online payment|slice)\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

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
        {
            item.T.PairId = null;
            item.T.IsRecurring = false;
        }

        await LinkAccountsAsync(user, items, accounts, cancellationToken);
        var cards = accounts.Where(a => a.AccountType == TrackerAccountTypes.Card).Select(a => a.Last4).ToHashSet();

        foreach (var item in items.Where(i => i.Free && i.Flow == TrackerFlows.Spend && i.Body is not null && Regex.IsMatch(i.Body, @"\bcard\b", RegexOptions.IgnoreCase)))
            if (AccountDigits(item) is { } last4 && cards.Contains(last4))
                item.Flow = TrackerFlows.CardSpend;

        await LinkLoansAsync(user, items, accounts, cancellationToken);
        MarkEchoes(items);
        MarkCardPaymentEchoes(items);
        var counted = items.Where(i => i.T.Status is not (TrackerStatuses.Ignored or TrackerStatuses.Duplicate)).ToList();
        PairSelfTransfers(counted, limits);
        PairCardBills(counted, limits);
        await ConfirmAsync(user, counted, cancellationToken);
        await LinkSeriesAsync(user, counted, accounts, cancellationToken);
        await LinkCardLoansAsync(user, counted, accounts, cancellationToken);
        PairRefunds(counted, limits);
        DropUnusedLoans(items, accounts);

        // What Tracker is sure of needs no check: an EMI of a known loan, a card's "payment received", and both sides of a pair (a self transfer, a card
        // bill and the card's payment, a refund). In the "review" mode the user still checks everything.
        if (user.ApprovalMode != TrackerApprovals.Review)
            foreach (var item in counted.Where(i => i.T.Status == TrackerStatuses.Pending && !i.T.TypeGuessed && ((i.Flow == TrackerFlows.Emi && i.T.LoanId is not null) || i.Flow == TrackerFlows.CardPaymentIn || i.T.PairId is not null)))
                item.T.Status = TrackerStatuses.Auto;

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
    public async Task RecordDueAsync(TrackerUser user, TrackerDueDto due, string provider, string? bankCode, CancellationToken cancellationToken)
    {
        var accounts = await _repository.GetAccountsAsync(user.Id, cancellationToken);
        var account = accounts.FirstOrDefault(a => a.AccountType == due.AccountType && a.Last4 == due.Last4) ?? accounts.FirstOrDefault(a => due.AccountType == TrackerAccountTypes.Card && a.AccountType == TrackerAccountTypes.Bank && a.Last4 == due.Last4);

        if (account is null)
        {
            account = new TrackerAccount { TrackerUserId = user.Id, AccountType = due.AccountType, Last4 = due.Last4, Provider = provider, BankCode = bankCode };
            _repository.AddAccount(account);
        }

        account.AccountType = due.AccountType;
        account.BankCode ??= bankCode;
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
                _repository.AddAccount(new TrackerAccount { TrackerUserId = user.Id, AccountType = TrackerAccountTypes.Loan, Last4 = last4, Provider = transaction.SmsText?.SenderName ?? string.Empty, BankCode = transaction.BankCode, EmiMinor = transaction.AmountMinor });

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

    // An amount that can be a loan's EMI by itself: from EmiMinMinor up and not whole hundreds of rupees (₹200, ₹1,000 and ₹2,000 a month are transfers,
    // savings or subscriptions, while an EMI is ₹12,922 or ₹1,465.00).
    private bool EmiLike(long minor)
    {
        return minor >= _options.Limits.EmiMinMinor && minor % 10000 != 0;
    }

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

    // A loan Tracker made from repeating payments: named by its EMI ("•• 22009"), not by a number the bank gave.
    private static bool MadeUp(TrackerAccount a)
    {
        var name = a.EmiMinor is { } emi ? Math.Round(emi / 100m).ToString(System.Globalization.CultureInfo.InvariantCulture) : null;

        return name is not null && a.Last4 == name[..Math.Min(8, name.Length)];
    }

    // In how many calendar months the payments were made.
    private static int Months(List<Item> series)
    {
        return series.Select(i => (i.T.OccurredOn.Year, i.T.OccurredOn.Month)).Distinct().Count();
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

    // A card's payment told twice: HDFC sends "PAYMENT OF Rs. 12922.00 RECEIVED TOWARDS YOUR CREDIT CARD ENDING WITH 0126" and, a day later, "Payment of
    // Rs 12922 was credited to your card ending 0126". The same amount to the same card within CardBillDays is one payment; the later one is a duplicate.
    // One the user confirmed or ignored is left alone.
    private void MarkCardPaymentEchoes(List<Item> items)
    {
        var kept = new List<Item>();

        foreach (var item in items.Where(i => i.Flow == TrackerFlows.CardPaymentIn && i.T.AccountLast4 is not null && !i.T.IsEdited && i.T.Status is not (TrackerStatuses.Confirmed or TrackerStatuses.Ignored) && (i.T.Status != TrackerStatuses.Duplicate || i.T.DuplicateReason == CardEcho)).OrderBy(i => i.T.OccurredOn).ThenBy(i => i.T.Id))
        {
            var first = kept.FirstOrDefault(o => AccountDigits(o) == AccountDigits(item) && o.T.AmountMinor == item.T.AmountMinor && Hours(o, item) <= _options.Limits.CardBillDays * 24);

            if (first is null)
            {
                kept.Add(item);

                if (item.T.DuplicateReason == CardEcho)
                {
                    item.T.Status = TrackerStatuses.Pending;
                    item.T.DuplicateOfId = null;
                    item.T.DuplicateReason = null;
                }

                continue;
            }

            item.T.Status = TrackerStatuses.Duplicate;
            item.T.DuplicateOfId = first.T.Id;
            item.T.DuplicateReason = CardEcho;
        }
    }

    // Two payments about a month apart (or two or three months, when one is missing): 30 days a month, give or take the window.
    private static bool Monthly(Item a, Item b, int window)
    {
        var days = Math.Abs((a.T.OccurredOn - b.T.OccurredOn).TotalDays);
        var months = Math.Round(days / 30);

        return months is >= 1 and <= 3 && Math.Abs(days - (months * 30)) <= window * months;
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

    // The debits a merchant's "payment received" can confirm: from an SMS, not changed by the user nor confirmed yet, a spend, card purchase or bill payment
    // (not one paired as a card bill) whose payee is that merchant ("JIO PREPAID", "Reliance Jio", "jiomobility@…"), is not named at all, or is only the
    // app or gateway the bill was paid through ("AMAZON PAY INDIA", "BBPS bill payment").
    private bool Confirmable(Item item, TrackerMerchantSenderOptions merchant)
    {
        var payee = item.Parsed?.MerchantRaw ?? item.T.Merchant;

        return item.T.Type == TrackerTypes.Debit && item.T.Source == TrackerSources.Sms && !item.T.IsEdited && item.T.ConfirmedBySmsId is null && (item.Flow is TrackerFlows.Spend or TrackerFlows.CardSpend || (item.Flow == TrackerFlows.CardBillPaid && item.T.PairId is null))
            && (payee is null || GatewayRegex.IsMatch(payee) || item.T.Merchant == merchant.Merchant || _reader.Names(payee, merchant.Merchant));
    }

    // The payments of each group that repeat: an amount within EmiTolerancePercent of the group's smallest, a month apart from another one of them, in at
    // least RecurringMinMonths calendar months.
    private List<List<Item>> Series(IEnumerable<IGrouping<string, Item>> groups)
    {
        var limits = _options.Limits;
        var tolerance = limits.EmiTolerancePercent / 100m;
        var found = new List<List<Item>>();

        foreach (var group in groups)
        {
            var left = group.OrderBy(i => i.T.AmountMinor).ToList();

            while (left.Count > 0)
            {
                var first = left[0].T.AmountMinor;
                var same = left.Where(i => i.T.AmountMinor - first <= first * tolerance).ToList();
                left.RemoveAll(same.Contains);
                var monthly = same.Where(i => same.Any(o => o != i && Monthly(o, i, limits.RecurringDayWindow))).OrderBy(i => i.T.OccurredOn).ToList();

                if (monthly.Select(i => (i.T.OccurredOn.Year, i.T.OccurredOn.Month)).Distinct().Count() >= limits.RecurringMinMonths)
                    found.Add(monthly);
            }
        }

        return found;
    }

    // A credit from a merchant within RefundDays after a debit to the same merchant of at least that amount is its refund (the latest such debit); the two
    // point at each other. Money back from a person is not a refund.
    private static void PairRefunds(List<Item> counted, TrackerLimitsOptions limits)
    {
        foreach (var credit in counted.Where(i => i.T.Type == TrackerTypes.Credit && i.T.PairId is null && i.T.Merchant is not null && i.Flow is TrackerFlows.Income or TrackerFlows.Refund or TrackerFlows.CardRefund && i.Parsed is not { Person: true }))
        {
            var debit = counted.Where(o => o.T.Type == TrackerTypes.Debit && o.T.PairId is null && string.Equals(o.T.Merchant, credit.T.Merchant, StringComparison.OrdinalIgnoreCase) && o.T.AmountMinor >= credit.T.AmountMinor && o.T.OccurredOn <= credit.T.OccurredOn && (credit.T.OccurredOn - o.T.OccurredOn).TotalDays <= limits.RefundDays).MaxBy(o => o.T.OccurredOn);

            if (debit is not null)
                Pair(debit, credit, debit.Flow, credit.Flow == TrackerFlows.CardRefund ? TrackerFlows.CardRefund : TrackerFlows.Refund);
        }
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

    // A loan Tracker made from repeating payments (named by its EMI, "ICICI Bank •• 2000") that no payment points at any more, without a due date from a
    // reminder or a name from the user, is removed: the payments that made it no longer count as EMIs.
    private static void DropUnusedLoans(List<Item> items, List<TrackerAccount> accounts)
    {
        var used = items.Where(i => i.T.LoanId is not null).Select(i => i.T.LoanId!.Value).ToHashSet();

        foreach (var loan in accounts.Where(a => a.AccountType == TrackerAccountTypes.Loan && a.Label is null && a.StatementDueOn is null && MadeUp(a) && !used.Contains(a.Id)))
            loan.IsSoftDeleted = true;
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

    // A merchant's "payment received" SMS waiting for its bank debit: exactly the same amount, within ConfirmDays before or after, paying that merchant or
    // naming no one. The closest in time wins, and each confirms one debit only. The debit takes the merchant's name, kind and category ("Jio · Bills"), is
    // ConfirmedPoints surer (approved by itself when that reaches the user's smart threshold), and a bill paid through BBPS that was taken for a card bill is
    // a spend again.
    private async Task ConfirmAsync(TrackerUser user, List<Item> counted, CancellationToken cancellationToken)
    {
        var texts = await _repository.GetConfirmationsAsync(user.Id, cancellationToken);
        var taken = counted.Where(i => i.T.ConfirmedBySmsId is not null).Select(i => i.T.ConfirmedBySmsId!.Value).ToHashSet();
        var window = TimeSpan.FromDays(_options.Limits.ConfirmDays);
        var matches = new List<(TrackerSmsText Text, TrackerMerchantSenderOptions Merchant, Item Item, TimeSpan Gap)>();

        foreach (var text in texts.Where(t => !taken.Contains(t.Id)))
        {
            var merchant = _reader.ParseSender(text.SenderHeader) is { } sender ? _reader.MerchantSender(sender.Code) : null;
            var minor = Body(text) is { } body ? (long)Math.Round(_reader.Parse(body, text.ReceivedOn).Amount * 100) : 0;

            if (merchant is not null && minor > 0)
                matches.AddRange(counted.Where(i => i.T.AmountMinor == minor && (i.T.OccurredOn - text.ReceivedOn).Duration() <= window && Confirmable(i, merchant)).Select(i => (text, merchant, i, (i.T.OccurredOn - text.ReceivedOn).Duration())));
        }

        foreach (var match in matches.OrderBy(m => m.Gap))
        {
            if (taken.Contains(match.Text.Id) || match.Item.T.ConfirmedBySmsId is not null)
                continue;

            var t = match.Item.T;
            taken.Add(match.Text.Id);
            t.ConfirmedBySmsId = match.Text.Id;
            t.ConfirmedBySms = match.Text;
            t.Merchant = match.Merchant.Merchant;
            t.Kind = match.Merchant.Kind ?? t.Kind;
            t.CategoryCode = match.Merchant.Category;
            t.Confidence = Math.Min(t.Confidence + ConfirmedPoints, 99);

            if (t.Status == TrackerStatuses.Pending && !t.TypeGuessed && user.ApprovalMode == TrackerApprovals.Smart && t.Confidence >= user.AutoApprovePercent)
                t.Status = TrackerStatuses.Auto;
        }

        foreach (var item in counted.Where(i => i.Free && i.T.ConfirmedBySmsId is not null && i.Flow == TrackerFlows.CardBillPaid && i.T.PairId is null))
            item.Flow = TrackerFlows.Spend;
    }

    // An EMI SMS that names its loan ("Insta Jumbo Loan XX0126 … Total Rs.14,772.82") makes or updates that loan; a debit within EmiTolerancePercent of a
    // loan's EMI is that EMI (an EMI, or a spend that pays neither a known merchant nor a person).
    private async Task LinkLoansAsync(TrackerUser user, List<Item> items, List<TrackerAccount> accounts, CancellationToken cancellationToken)
    {
        foreach (var item in items.Where(i => i.Flow == TrackerFlows.Emi && i.Body is not null && LoanNumberRegex.IsMatch(i.Body)))
        {
            var last4 = Last4(LoanNumberRegex.Match(item.Body!).Groups[1].Value);
            var loan = accounts.FirstOrDefault(a => a.AccountType == TrackerAccountTypes.Loan && a.Last4 == last4);

            if (loan is null)
            {
                loan = new TrackerAccount { TrackerUserId = user.Id, AccountType = TrackerAccountTypes.Loan, Last4 = last4, Provider = item.T.SmsText?.SenderName ?? string.Empty, BankCode = item.T.BankCode };
                accounts.Add(loan);
                _repository.AddAccount(loan);
            }

            loan.EmiMinor = item.T.AmountMinor;
            item.Loan = loan;
        }

        await _repository.SaveChangesAsync(cancellationToken);
        // A loan named in the bank's own messages ("Personal Loan XX1881") is matched before one Tracker made from repeating payments ("•• 43843").
        var loans = accounts.Where(a => a.AccountType == TrackerAccountTypes.Loan && a.EmiMinor is > 0).OrderBy(MadeUp).ToList();
        var tolerance = _options.Limits.EmiTolerancePercent / 100m;

        foreach (var item in items)
        {
            var loan = item.Loan ?? (item.T.Type == TrackerTypes.Debit && (item.Flow == TrackerFlows.Emi || (item.Flow == TrackerFlows.Spend && EmiLike(item.T.AmountMinor) && item.Parsed is not { Known: true } and not { Person: true })) ? loans.FirstOrDefault(l => Math.Abs(l.EmiMinor!.Value - item.T.AmountMinor) <= l.EmiMinor.Value * tolerance) : null);

            if (loan is not null && item.Free)
                item.Flow = TrackerFlows.Emi;

            // An auto-debit of a small or round amount that pays no loan ("SI … Rs 60", a ₹2,000 NACH) is a payment, not an EMI.
            if (loan is null && item.Free && item.Flow == TrackerFlows.Emi && !EmiLike(item.T.AmountMinor))
                item.Flow = TrackerFlows.Spend;

            item.T.LoanId = item.Flow == TrackerFlows.Emi ? loan?.Id : null;
        }
    }

    // Recurring payments: debits within EmiTolerancePercent of each other, about a month apart, in at least RecurringMinMonths months. At a merchant with a
    // kind (a subscription, a phone or electricity bill: grouped by merchant) they are only marked recurring. Otherwise they are grouped by account or card:
    // auto-debits (the SMS says EMI, NACH, ACH, mandate…) of an EMI-like amount, or spends of one that pay no known merchant or person in EmiMinMonths
    // months, are an EMI series: the loan with that EMI is found or made ("EMI ₹22,001"), and each payment counts as its EMI. Any other series is only
    // recurring. Rent and salary never are an EMI; a flow the user chose is never changed.
    private async Task LinkSeriesAsync(TrackerUser user, List<Item> counted, List<TrackerAccount> accounts, CancellationToken cancellationToken)
    {
        var debits = counted.Where(i => i.T.Type == TrackerTypes.Debit).ToList();

        foreach (var item in Series(debits.Where(i => i.T.Kind is not null && i.T.Merchant is not null).GroupBy(i => i.T.Merchant!.ToLowerInvariant())).SelectMany(s => s))
            item.T.IsRecurring = true;

        var candidates = debits.Where(i => i.Free && i.T.Kind is null && i.T.LoanId is null && i.T.ConfirmedBySmsId is null && i.T.PairId is null && i.Parsed is { Known: false, Person: false } && i.T.CategoryCode is not ("rent" or "salary")
            && i.Flow is TrackerFlows.Spend or TrackerFlows.Emi);
        var tolerance = _options.Limits.EmiTolerancePercent / 100m;

        foreach (var series in Series(candidates.GroupBy(i => AccountDigits(i) ?? string.Empty)))
        {
            var emi = series.GroupBy(i => i.T.AmountMinor).MaxBy(g => g.Count())!.Key;

            // Only an EMI-like amount is a loan's EMI: from an auto-debit the bank calls one (EMI, NACH, ACH, mandate…), or a plain payment that came back in
            // EmiMinMonths months ("BIL*NEFT" of ₹22,001.10, ₹22,002.20…). Anything else that comes back every month is only recurring.
            if (!EmiLike(emi) || (series.Any(i => i.Flow != TrackerFlows.Emi) && Months(series) < _options.Limits.EmiMinMonths))
            {
                foreach (var item in series)
                    item.T.IsRecurring = true;

                continue;
            }

            var name = Math.Round(emi / 100m).ToString(System.Globalization.CultureInfo.InvariantCulture);
            name = name[..Math.Min(8, name.Length)];
            var loan = accounts.OrderBy(MadeUp).FirstOrDefault(a => a.AccountType == TrackerAccountTypes.Loan && a.EmiMinor is > 0 && Math.Abs(a.EmiMinor.Value - emi) <= a.EmiMinor.Value * tolerance) ?? accounts.FirstOrDefault(a => a.AccountType == TrackerAccountTypes.Loan && a.Last4 == name);

            if (loan is null)
            {
                loan = new TrackerAccount { TrackerUserId = user.Id, AccountType = TrackerAccountTypes.Loan, Last4 = name, Provider = series[0].T.SmsText?.SenderName ?? string.Empty, BankCode = series[0].T.BankCode };
                accounts.Add(loan);
                _repository.AddAccount(loan);
            }

            loan.EmiMinor ??= emi;
            await _repository.SaveChangesAsync(cancellationToken);

            foreach (var item in series)
            {
                item.Flow = TrackerFlows.Emi;
                item.T.LoanId = loan.Id;
            }
        }

        // The EMIs of one loan paid in at least RecurringMinMonths months (a series found now, or linked to its loan before) are recurring.
        foreach (var loanEmis in counted.Where(i => i.Flow == TrackerFlows.Emi && i.T.LoanId is not null).GroupBy(i => i.T.LoanId))
            if (loanEmis.Select(i => (i.T.OccurredOn.Year, i.T.OccurredOn.Month)).Distinct().Count() >= _options.Limits.RecurringMinMonths)
                foreach (var item in loanEmis)
                    item.T.IsRecurring = true;
    }

    // Every account number in the SMS becomes a bank account or a card of the user (a number seen on a card is a card); each transaction points at its own.
    private async Task LinkAccountsAsync(TrackerUser user, List<Item> items, List<TrackerAccount> accounts, CancellationToken cancellationToken)
    {
        foreach (var item in items.Where(i => i.T.AccountLast4 is not null))
        {
            var last4 = Last4(item.T.AccountLast4!);
            var type = CardFlows.Contains(item.Flow) || item.Parsed is { Card: true } ? TrackerAccountTypes.Card : TrackerAccountTypes.Bank;
            var account = accounts.FirstOrDefault(a => a.AccountType != TrackerAccountTypes.Loan && a.Last4 == last4);

            if (last4.Length < 3)
                continue;

            if (account is null)
            {
                account = new TrackerAccount { TrackerUserId = user.Id, AccountType = type, Last4 = last4, Provider = item.T.SmsText?.SenderName ?? string.Empty, BankCode = item.T.BankCode };
                accounts.Add(account);
                _repository.AddAccount(account);
            }
            else
            {
                account.BankCode ??= item.T.BankCode;

                if (type == TrackerAccountTypes.Card)
                    account.AccountType = TrackerAccountTypes.Card;
            }
        }

        await _repository.SaveChangesAsync(cancellationToken);

        foreach (var item in items)
            item.T.AccountId = item.T.AccountLast4 is { } number ? accounts.FirstOrDefault(a => a.AccountType != TrackerAccountTypes.Loan && a.Last4 == Last4(number))?.Id : null;
    }

    // A loan paid through a credit card: an HDFC Insta Jumbo Loan is repaid with the card's bill, so the card gets the same EMI-like payment every month
    // (card 0126: ₹12,922; card 6124: ₹1,465–1,474). Payments to one card within EmiTolerancePercent of each other in EmiMinMonths months are that loan's
    // EMIs: the loan with the card's number (or with that EMI, from a statement) is found or made. Each month's EMI is counted once: on the bank debit
    // paired with the card's payment (paid through CRED, slice…), or on the card's payment itself when the bank's SMS is missing.
    private async Task LinkCardLoansAsync(TrackerUser user, List<Item> counted, List<TrackerAccount> accounts, CancellationToken cancellationToken)
    {
        var tolerance = _options.Limits.EmiTolerancePercent / 100m;

        // The latest series comes last, so the loan keeps the EMI it has now (card 6124: ₹1,465 today, ₹3,299 in 2024).
        foreach (var series in Series(counted.Where(i => i.Flow == TrackerFlows.CardPaymentIn && i.T.AccountLast4 is not null).GroupBy(i => AccountDigits(i)!)).OrderBy(s => s.Max(i => i.T.OccurredOn)))
        {
            var emi = series.GroupBy(i => i.T.AmountMinor).MaxBy(g => g.Count())!.Key;

            if (!EmiLike(emi) || Months(series) < _options.Limits.EmiMinMonths)
                continue;

            var last4 = AccountDigits(series[0])!;
            var loan = accounts.FirstOrDefault(a => a.AccountType == TrackerAccountTypes.Loan && a.Last4 == last4) ?? accounts.FirstOrDefault(a => a.AccountType == TrackerAccountTypes.Loan && a.EmiMinor is > 0 && Math.Abs(a.EmiMinor.Value - emi) <= a.EmiMinor.Value * tolerance);

            if (loan is null)
            {
                loan = new TrackerAccount { TrackerUserId = user.Id, AccountType = TrackerAccountTypes.Loan, Last4 = last4, Provider = series[0].T.SmsText?.SenderName ?? string.Empty, BankCode = series[0].T.BankCode };
                accounts.Add(loan);
                _repository.AddAccount(loan);
            }

            loan.EmiMinor = emi;
            await _repository.SaveChangesAsync(cancellationToken);

            foreach (var item in series)
            {
                var paid = item.T.PairId is { } pairId ? counted.FirstOrDefault(o => o.T.Id == pairId) ?? item : item;

                if (!paid.Free)
                    continue;

                paid.Flow = TrackerFlows.Emi;
                paid.T.LoanId = loan.Id;
                paid.T.IsRecurring = true;
            }
        }
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
