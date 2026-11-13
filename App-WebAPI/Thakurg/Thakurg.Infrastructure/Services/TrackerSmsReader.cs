using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Tracker;

namespace Thakurg.Infrastructure.Services;

// Reads one bank or UPI SMS with the rules of the prototype (App-Prototype/assets/js/snaptracker.js, also used by Mojito's demo backend): the sender list
// (Tracker:Senders), the OTP, promotion and failed-payment filters, then the amount, direction, method, account, reference, date and merchant (the
// merchant dictionary is Tracker:Merchants). It never invents a merchant the message does not show. Dates in an SMS are local time (Tracker:TimeZone).
public class TrackerSmsReader : ITrackerSmsReader
{
    private readonly TimeZoneInfo _timeZone;

    private readonly TrackerOptions _options;

    private const RegexOptions Flags = RegexOptions.IgnoreCase | RegexOptions.CultureInvariant;

    private readonly List<(Regex Pattern, TrackerMerchantOptions Merchant)> _merchants;

    private static readonly Regex AmountRegex = new(@"(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)", Flags);

    private static readonly Regex TimeRegex = new(@"\b(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?\b", Flags);

    private static readonly Regex SenderRegex = new(@"^(?:[A-Z]{2}-)?([A-Z0-9]{6})(?:-([TSPG]))?$", Flags);

    private static readonly Regex BadMerchantWordRegex = new(@"\b(a\/c|acct|account|bank)\b", Flags);

    private static readonly Regex HeaderRegex = new(@"\b[A-Z]{2}-[A-Z0-9]{6}\b", RegexOptions.CultureInvariant);

    private static readonly Regex VpaRegex = new(@"(?:vpa|upi id|to|from|by)\s*[:\-]?\s*([a-z0-9][a-z0-9._-]{1,40}@[a-z][a-z0-9]{1,20})", Flags);

    private static readonly Regex P2mRegex = new(@"UPI\/P2[MA]\/\d+\/([A-Za-z0-9 &.'-]{2,40}?)(?=\s*[.,\/]|\s+ref|\s*$)", Flags);

    private static readonly Regex LoanInRegex = new(@"@yescred\b|_yesc\b", Flags);

    private static readonly Regex FutureRegex = new(@"\bwill be \w+|\bdebited on holidays\b", Flags);

    private static readonly Regex PayeeRegex = new(@";\s*([A-Za-z][A-Za-z .&'-]{1,40}?)\s+credited\b", Flags);

    private static readonly Regex SalaryRegex = new(@"\bsalary\b|\bsal\b|payroll", Flags);

    private static readonly Regex CardRegex = new(@"credit card|\bavl\.?\s*(?:limit|lmt)\b", Flags);

    private static readonly Regex EmiRegex = new(@"\bumrn\b|\bemi\b|\bnach\b|\becs\b|\bloan\b", Flags);

    private static readonly Regex SalaryNeftRegex = new(@"\bNEFT-[A-Z0-9]+-([A-Z]+)\b", Flags);

    private static readonly Regex EchoRegex = new(@"\bNEFT money transfer\b.*\bcredited to\b", Flags);

    private static readonly Regex BeneficiaryRegex = new(@"credited to the beneficiary account", Flags);

    private static readonly Regex BalanceNoticeRegex = new(@"available bal(?:ance)? in .* as on|passbook balance", Flags);

    private static readonly Regex JumboRegex = new(@"insta ?jumbo ?loan .*?total rs\.?\s*([\d,]+(?:\.\d{1,2})?)", Flags);

    private static readonly Regex CardBillRegex = new(@"cred club|cred\.club@|credit card (?:bill|payment)|towards (?:your )?(?:[a-z]+ )*credit card|\bto (?:[a-z]+ )*credit card|\bbbps\b", Flags);

    private static readonly Regex CardPaymentInRegex = new(@"payment of (?:rs\.?|inr)\s*[\d,.]+ (?:has been |is )?received (?:on|towards|for) your|received towards your .*credit card|\brepayment of (?:rs\.?|inr)\s*[\d,.]+ received|payment of (?:rs\.?|inr)\s*[\d,.]+.{0,40}?was credited to your (?:credit )?card", Flags);

    // The account or card: "A/C *9781", "A/c ...7646", "AC X7887", "A/C No 9781", "Acct XX260", "Card no. XX1003", "card number ending with 4133".
    private static readonly Regex AccountRegex = new(@"(?:a\/c|acct|account|\bacc?\b|card)(?:\s*no\.?|\s*number)?\s*(?:ending(?:\s*with)?\s*)?(?:[x*.]+\s?)?(\d{3,6})\b", Flags);

    // "Avl Bal Rs 1,234.50", "AvlBal:Rs28209.38", "Avl Limit: INR 7,24,716.91", "Total Bal:Rs.7000.14CR", "Bal Rs.12,345": never the amount of the transaction.
    private static readonly Regex BalanceRegex = new(@"\b(?:avl|avb|avbl|avlbl|available|total)\.?\s*(?:bal(?:ance)?|lmt|limit|amt|amount)\.?\s*(?:is\s*)?[:\-]?\s*(?:(?:rs\.?|inr|₹)\s*)?[\d,]+(?:\.\d{1,2})?(?:\s*(?:cr|dr)\b)?|\bbal\s*(?:rs\.?|inr|₹)\s*[\d,]+(?:\.\d{1,2})?", Flags);

    // Reminders, statements, applications and service notices: money has not moved, so no transaction is made.
    private static readonly Regex NoticeRegex = new(@"\bis due (?:on|by)\b|\bdue (?:on|date)\b|statement (?:is sent|has been generated|is generated|generated)|e-?statement|min(?:imum)? (?:amt|amount) due|ignore if paid|\bapplication\b|re-?kyc|details are missing|process of adding|limit options|maintenance|loan facility|loan is boarded|\brequest\b|increasing the limit|mandate|has been assigned|\breminder\b|\btotal cash ?back\b|\bcredit limit\b|\bstatement:|\b(?:total|amount|min\.?) due\b|\bpay by\b", Flags);

    private static readonly Regex OtpWordRegex = new(@"\b(otp|one[- ]time password|verification code|security code|auth(?:entication)? code)\b", Flags);

    private static readonly Regex DoneRegex = new(@"\b(debited|credited|withdrawn|spent|deposited|has been (?:paid|sent|received))\b", Flags);

    private static readonly Regex TransactionRegex = new(@"\b(debited|credited|spent|withdrawn|deposited|sent|paid|received|refund(?:ed)?)\b", Flags);

    private static readonly Regex AmountAltRegex = new(@"\b(?:debited|credited)\s+(?:by|with|for)\s+(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)", Flags);

    private static readonly Regex CreditRegex = new(@"\b(credited|received|deposited|refund(?:ed)?|reversed|added to)\b", Flags);

    private static readonly Regex FailedRegex = new(@"\b(failed|declined|unsuccessful|not successful|could not be (?:processed|completed)|cannot process)\b", Flags);

    private static readonly Regex SettledRefundRegex = new(@"\b(?:has been|is|was|were)\s+(?:credited|refunded|reversed)\b|\breversed to\b", Flags);

    private static readonly Regex DebitRegex = new(@"\b(debited|spent|sent|paid|withdrawn|deducted|purchase|payment of|transferred to)\b", Flags);

    private static readonly Regex BadMerchantRegex = new(@"^(a\/c|ac\b|acct|account|your|you\b|the\b|card|upi\b|neft|imps|rtgs|xx|rs\b|rs\d|inr|date\b|txn|\d)", Flags);

    private static readonly Regex[] DateRegexes = [new(@"\b(\d{1,2})[-\/ ]?([A-Za-z]{3})[a-z]*[-\/ ,]?(\d{2,4})\b", Flags), new(@"\b(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})\b", Flags), new(@"\b(\d{4})-(\d{2})-(\d{2})\b", Flags)];

    private static readonly Regex PromotionRegex = new(@"\b(offers?|cashback|discount|win|won|congratulations|pre-?approved|apply now|click|limited (?:period|time)|voucher|upto|sale|hurry|exclusive)\b", Flags);

    private static readonly Regex[] ReferenceRegexes = [new(@"UPI\/P2[MA]\/(\d{6,22})\/", Flags), new(@"\b(?:upi\s*)?ref(?:erence)?\.?\s*(?:no\.?|number|#|id)?\s*[:.#-]?\s*([A-Z0-9]{6,22})\b", Flags), new(@"\b(?:txn|transaction)\s*(?:id|no\.?)\s*[:#-]?\s*([A-Z0-9]{6,22})\b", Flags), new(@"\butr\s*(?:no\.?)?\s*[:#-]?\s*([A-Z0-9]{6,22})\b", Flags)];

    private static readonly string[] Months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

    private const string Stop = @"(?=\s+(?:on\b|via\b|using\b|ref|upi\b|is\b|has\b|from\b|with\b|avl|info\b|\()|\s*[.,(:;]|\s*$)";

    public TrackerSmsReader(IOptions<TrackerOptions> options)
    {
        _options = options.Value;
        _timeZone = TimeZoneInfo.FindSystemTimeZoneById(_options.TimeZone);
        _merchants = _options.Merchants.Select(m => (new Regex(m.Pattern, Flags), m)).ToList();
    }

    #region Public Methods

    public bool IsOtp(string body)
    {
        return OtpWordRegex.IsMatch(body) && Regex.IsMatch(body, @"\b\d{4,8}\b") && !DoneRegex.IsMatch(body);
    }

    public bool IsFailed(string body)
    {
        return FailedRegex.IsMatch(body) && !SettledRefundRegex.IsMatch(body);
    }

    public string? SenderName(string code)
    {
        return _options.Senders.TryGetValue(code, out var name) ? name : null;
    }

    // What a reminder or statement says is due: a loan's EMI ("EMI of Rs 75891.00 for ICICI Bank Personal Loan XX1881 is due on 10-Nov-25") or a card's
    // statement ("Credit Card XX0003 Statement … Total of Rs 4,50,000.00 … due by 18-FEB-26", "Total due: Rs.1,061.00 … Pay by 13-10-2025"). Null otherwise.
    public TrackerDueDto? Due(string body)
    {
        var loan = Regex.IsMatch(body, @"\bemi\b", Flags) && Regex.IsMatch(body, @"\bloan\b", Flags);
        var card = !loan && Regex.IsMatch(body, @"credit card", Flags);
        var number = Regex.Match(body, @"(?:loan|card)(?:\s*no\.?)?\s*(?:ending(?:\s*with)?\s*)?[x*]*\s?(\d{3,6})\b", Flags);
        // Only an amount the message calls due (an EMI, a statement total), never another one ("increase the limit from Rs 5,00,000 to Rs 7,30,000").
        var amount = Regex.Match(body, @"(?:emi of|(?:rs\.?|inr|₹)\s*(?=[\d,.]+\s*emi\b)|total(?: of| due| amt)?|amount due|statement .{0,40}?of inr)\s*:?\s*(?:rs\.?|inr|₹)?\s*(?:dr\.?\s*)?([\d,]+(?:\.\d{1,2})?)", Flags);

        if (!(loan || card) || !number.Success || !amount.Success || !decimal.TryParse(amount.Groups[1].Value.Replace(",", ""), NumberStyles.Number, CultureInfo.InvariantCulture, out var value) || value <= 0)
            return null;

        var due = Regex.Match(body, @"\b(?:due (?:on|by|date)|pay by)\s*:?\s*(.{6,14})", Flags);

        return new TrackerDueDto { AccountType = loan ? TrackerAccountTypes.Loan : TrackerAccountTypes.Card, Last4 = number.Groups[1].Value[^Math.Min(4, number.Groups[1].Value.Length)..], Amount = value, DueOn = due.Success ? DueDate(due.Groups[1].Value) : null };
    }

    // A message that is not a transaction: a balance ("balance"), a reminder, statement or notice ("notice"), or the employer's bank telling that a salary
    // was sent to the user ("echo": the user's own bank reports the same money). An Insta Jumbo statement is kept: it is the EMI of a loan on the card.
    public string? Skip(string body, TrackerOwnerDto owner)
    {
        if (JumboRegex.IsMatch(body))
            return null;

        if (BalanceNoticeRegex.IsMatch(body) || (BalanceRegex.IsMatch(body) && !TransactionRegex.IsMatch(BalanceRegex.Replace(body, " "))))
            return "balance";

        // "EMI will be debited on holidays too" describes a future debit; it does not make a reminder a transaction.
        if (NoticeRegex.IsMatch(body) && !DoneRegex.IsMatch(FutureRegex.Replace(body, " ")))
            return "notice";

        return EchoRegex.IsMatch(body) && Mentions(body, owner.Names) ? "echo" : null;
    }

    public bool IsPromotion(string body, string senderKind)
    {
        return senderKind == "P" || (PromotionRegex.IsMatch(body) && !TransactionRegex.IsMatch(body));
    }

    public (string Code, string Kind)? ParseSender(string sender)
    {
        var match = SenderRegex.Match(sender.Trim());

        return match.Success ? (match.Groups[1].Value.ToUpperInvariant(), match.Groups[2].Success ? match.Groups[2].Value.ToUpperInvariant() : "T") : null;
    }

    public TrackerParsedSmsDto Parse(string body, DateTime receivedAt)
    {
        // Balances and card limits are blanked out first (same length, so every position still points into the message), then the amount is read.
        var plain = BalanceRegex.Replace(body, m => new string(' ', m.Length));
        var amountMatch = JumboRegex.Match(plain) is { Success: true } jumbo ? jumbo : AmountAltRegex.Match(plain) is { Success: true } alt ? alt : AmountRegex.Match(plain);
        var amount = amountMatch.Success && decimal.TryParse(amountMatch.Groups[1].Value.Replace(",", ""), NumberStyles.Number, CultureInfo.InvariantCulture, out var value) ? value : 0;
        var isRefund = Regex.IsMatch(body, @"\b(refund(?:ed)?|reversed|reversal)\b", Flags);
        var debitAt = DebitRegex.Match(plain) is { Success: true } d ? d.Index : -1;
        var creditAt = CreditRegex.Match(plain) is { Success: true } c ? c.Index : -1;
        // "NEFT … has been credited to the beneficiary account" is the bank confirming money the user sent, and an Insta Jumbo statement is an EMI due.
        // A card's "payment of Rs X received" is money coming into the card, though "payment of" reads like a debit.
        var outgoing = BeneficiaryRegex.IsMatch(body) || JumboRegex.IsMatch(body);
        var type = CardPaymentInRegex.IsMatch(body) ? TrackerTypes.Credit : outgoing ? TrackerTypes.Debit : isRefund && creditAt >= 0 ? TrackerTypes.Credit : debitAt >= 0 && (creditAt < 0 || debitAt < creditAt) ? TrackerTypes.Debit : creditAt >= 0 ? TrackerTypes.Credit : null;
        var card = (CardRegex.IsMatch(body) || JumboRegex.IsMatch(body)) && !(type == TrackerTypes.Debit && CardBillRegex.IsMatch(body));
        var method = card ? TrackerMethods.CreditCard : Method(body);
        var account = AccountRegex.Match(body);
        var reference = ReferenceRegexes.Select(r => r.Match(body)).FirstOrDefault(m => m.Success && m.Groups[1].Value.Any(char.IsDigit));
        var (at, dateFound) = ParseDate(body, receivedAt);
        var merchant = type is null ? new MerchantFound(null, null, null, null, false, false) : ExtractMerchant(body, type, method);

        return new TrackerParsedSmsDto
        {
            Card = card,
            Amount = amount > 0 ? amount : 0,
            AmountText = amountMatch.Success ? amountMatch.Value : null,
            Type = type,
            Ambiguous = debitAt >= 0 && creditAt >= 0 && !isRefund,
            IsRefund = isRefund,
            Method = method,
            Account = account.Success ? "XX" + account.Groups[1].Value[^Math.Min(4, account.Groups[1].Value.Length)..] : null,
            AccountText = account.Success ? account.Value : null,
            Ref = reference?.Groups[1].Value.ToUpperInvariant(),
            RefText = reference?.Value,
            At = at,
            DateFound = dateFound,
            Merchant = merchant.Name,
            MerchantRaw = merchant.Raw,
            Known = merchant.Known,
            MerchantCategory = merchant.Category,
            MerchantKind = merchant.Kind,
            Person = merchant.Person,
        };
    }

    public int Confidence(TrackerParsedSmsDto parsed, string category)
    {
        var score = 30 + (parsed.Amount > 0 ? 25 : 0) + (parsed.Type is not null ? 15 : 0) + (parsed.Known ? 15 : parsed.Merchant is not null ? 7 : 0) + (parsed.Account is not null ? 4 : 0)
            + (parsed.Ref is not null ? 4 : 0) + (parsed.DateFound ? 3 : 0) + (parsed.Method != TrackerMethods.Bank ? 3 : 0) - (category == "other" ? 8 : 0) - (parsed.Ambiguous ? 10 : 0);

        if (parsed.Type is null)
            score = Math.Min(score, 40);

        return Math.Clamp(score, 5, 99);
    }

    // What the transaction counts towards (TrackerFlows), in this order: a card's "payment received", a card bill paid from the bank (CRED, BBPS, "towards
    // credit card"), a card purchase or money back to a card, an EMI (auto-debit with a UMRN, EMI, NACH, ECS, loan), money to or from the user's own name or
    // mobile, then a plain spend; for money in: salary (the word, or an employer NEFT naming the user), money borrowed through CRED, a refund, other income.
    public string Flow(TrackerParsedSmsDto parsed, string body, TrackerOwnerDto owner)
    {
        var credit = parsed.Type == TrackerTypes.Credit;

        if (JumboRegex.IsMatch(body))
            return TrackerFlows.Emi;

        if (credit && CardPaymentInRegex.IsMatch(body))
            return TrackerFlows.CardPaymentIn;

        if (!credit && CardBillRegex.IsMatch(body))
            return TrackerFlows.CardBillPaid;

        if (parsed.Card)
            return credit ? TrackerFlows.CardRefund : TrackerFlows.CardSpend;

        if (!credit && EmiRegex.IsMatch(body))
            return TrackerFlows.Emi;

        if (Mentions(body, owner.Names) || owner.Mobiles.Any(m => OwnHandle(body, m)))
            return TrackerFlows.SelfTransfer;

        if (!credit)
            return TrackerFlows.Spend;

        if (SalaryRegex.IsMatch(body) || (SalaryNeftRegex.Match(body) is { Success: true } neft && owner.Names.Any(n => n.Split(' ')[0].Equals(neft.Groups[1].Value, StringComparison.OrdinalIgnoreCase))))
            return TrackerFlows.Salary;

        if (LoanInRegex.IsMatch(body))
            return TrackerFlows.LoanIn;

        return parsed.IsRefund ? TrackerFlows.Refund : TrackerFlows.Income;
    }

    public string Categorize(TrackerParsedSmsDto parsed, string body, IReadOnlyDictionary<string, string> rules)
    {
        if (parsed.Merchant is not null && rules.TryGetValue(parsed.Merchant.ToLowerInvariant(), out var chosen))
            return chosen;

        if (parsed.Method == TrackerMethods.Atm)
            return "cash";

        if (parsed.Type == TrackerTypes.Credit)
            return Regex.IsMatch(body, @"\bsalary\b|\bsal\b|payroll", Flags) ? "salary" : parsed.IsRefund || (parsed.Known && parsed.MerchantCategory != "transfer") ? "refund" : parsed.Person ? "transfer" : "other";

        if (parsed.MerchantCategory is not null)
            return parsed.MerchantCategory;

        if (Regex.IsMatch(body, @"\brent\b", Flags))
            return "rent";

        return Regex.IsMatch(body, @"electricity|recharge|broadband|\bdth\b|\bgas\b|\bbill\b", Flags) ? "bills" : "other";
    }

    #endregion

    #region Private Methods

    private static int Year(string text)
    {
        return text.Length == 2 ? 2000 + int.Parse(text) : int.Parse(text);
    }

    private static Regex Words(string words)
    {
        return new Regex($@"\b(?:{words})\s+([A-Za-z0-9][A-Za-z0-9&'\-\/ ]{{1,45}}?)" + Stop, Flags);
    }

    private static string Method(string body)
    {
        if (Regex.IsMatch(body, @"\batm\b", Flags) && Regex.IsMatch(body, "withdra", Flags))
            return TrackerMethods.Atm;

        if (Regex.IsMatch(body, @"\b(upi|vpa)\b|@[a-z]{2,}", Flags))
            return TrackerMethods.Upi;

        if (Regex.IsMatch(body, "credit card", Flags))
            return TrackerMethods.CreditCard;

        if (Regex.IsMatch(body, "debit card", Flags))
            return TrackerMethods.DebitCard;

        if (Regex.IsMatch(body, @"\bcard\b", Flags))
            return TrackerMethods.Card;

        if (Regex.IsMatch(body, @"\b(neft|imps|rtgs)\b", Flags))
            return Regex.IsMatch(body, @"\bneft\b", Flags) ? TrackerMethods.Neft : Regex.IsMatch(body, @"\bimps\b", Flags) ? TrackerMethods.Imps : TrackerMethods.Rtgs;

        return Regex.IsMatch(body, "net ?banking", Flags) ? TrackerMethods.NetBanking : TrackerMethods.Bank;
    }

    private MerchantFound? Lookup(string text)
    {
        var hit = _merchants.FirstOrDefault(m => m.Pattern.IsMatch(text));

        return hit.Merchant is null ? null : new MerchantFound(hit.Merchant.Name, null, hit.Merchant.Category, hit.Merchant.Kind, true, false);
    }

    private static string TitleCase(string text)
    {
        var words = Regex.Split(text.Trim().ToLowerInvariant(), @"\s+").Where(w => w.Length > 0);

        return string.Join(' ', words.Select(w => char.ToUpperInvariant(w[0]) + w[1..]));
    }

    // A due date as banks write it: "10-Nov-25", "18-FEB-26", "13-10-2025", "14/JUN/2026" (a calendar date, no time).
    private static DateTime? DueDate(string text)
    {
        var named = Regex.Match(text, @"(\d{1,2})[-\/ ]([A-Za-z]{3})[a-z]*[-\/ ](\d{2,4})", Flags);
        var month = named.Success ? Array.IndexOf(Months, named.Groups[2].Value.ToLowerInvariant()) : -1;

        if (month >= 0)
            return SafeDate(Year(named.Groups[3].Value), month + 1, int.Parse(named.Groups[1].Value));

        var digits = DateRegexes[1].Match(text);

        return digits.Success ? SafeDate(Year(digits.Groups[3].Value), int.Parse(digits.Groups[2].Value), int.Parse(digits.Groups[1].Value)) : null;
    }

    // A UPI id of the user's own mobile: "9540000677@yescred", "9540000677_yesc", or masked to the last digits as "*0677@slc".
    private static bool OwnHandle(string body, string mobile)
    {
        var digits = new string(mobile.Where(char.IsDigit).ToArray());

        return digits.Length >= 4 && Regex.IsMatch(body, $@"(?:\b{digits}|[*x]+{digits[^4..]})(?:@|_)", Flags);
    }

    private static string? FirstGood(Regex regex, string body)
    {
        foreach (Match match in regex.Matches(body))
        {
            var candidate = match.Groups[1].Value.Trim();

            if (candidate.Length > 1 && !BadMerchantRegex.IsMatch(candidate) && !BadMerchantWordRegex.IsMatch(candidate))
                return candidate;
        }

        return null;
    }

    // One of the user's names as a whole phrase, with any spacing and an optional "Mr" ("To Kunal Kumar", "from KUNAL KUMAR", "MR KUNAL KUMAR credited").
    private static bool Mentions(string body, List<string> names)
    {
        return names.Any(n => n.Trim().Length > 0 && Regex.IsMatch(body, $@"\b(?:mr\.?\s+)?{string.Join(@"\s+", n.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries).Select(Regex.Escape))}\b", Flags));
    }

    private static DateTime? SafeDate(int year, int month, int day)
    {
        return month is >= 1 and <= 12 && day >= 1 && year is >= 2000 and <= 2100 && day <= DateTime.DaysInMonth(year, month) ? new DateTime(year, month, day) : null;
    }

    // The date and time written in the message (local time of Tracker:TimeZone), or the time it arrived when there is none or it is not plausible.
    private (DateTime At, bool Found) ParseDate(string body, DateTime receivedAt)
    {
        var local = TimeZoneInfo.ConvertTimeFromUtc(receivedAt, _timeZone);
        DateTime? date = null;
        var match = DateRegexes[0].Match(body);
        var month = match.Success ? Array.IndexOf(Months, match.Groups[2].Value.ToLowerInvariant()) : -1;

        if (match.Success && month >= 0)
            date = SafeDate(Year(match.Groups[3].Value), month + 1, int.Parse(match.Groups[1].Value));
        else if ((match = DateRegexes[2].Match(body)).Success)
            date = SafeDate(int.Parse(match.Groups[1].Value), int.Parse(match.Groups[2].Value), int.Parse(match.Groups[3].Value));
        else if ((match = DateRegexes[1].Match(body)).Success)
            date = SafeDate(Year(match.Groups[3].Value), int.Parse(match.Groups[2].Value), int.Parse(match.Groups[1].Value));

        if (date is null || date.Value > local.AddDays(1) || date.Value < local.AddDays(-60))
            return (receivedAt, false);

        var time = TimeRegex.Match(body);
        var hour = local.Hour;
        var minute = local.Minute;

        if (time.Success)
        {
            hour = int.Parse(time.Groups[1].Value);
            minute = int.Parse(time.Groups[2].Value);

            if (time.Groups[3].Success && time.Groups[3].Value.Equals("pm", StringComparison.OrdinalIgnoreCase) && hour < 12)
                hour += 12;

            if (time.Groups[3].Success && time.Groups[3].Value.Equals("am", StringComparison.OrdinalIgnoreCase) && hour == 12)
                hour = 0;
        }

        if (hour > 23 || minute > 59)
            return (receivedAt, false);

        var at = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(date.Value.Date.AddHours(hour).AddMinutes(minute), DateTimeKind.Unspecified), _timeZone);

        return (at < receivedAt ? at : receivedAt, true);
    }

    private MerchantFound ExtractMerchant(string body, string type, string method)
    {
        if (method == TrackerMethods.Atm)
            return new MerchantFound("ATM", null, "cash", null, true, false);

        string? raw = null;
        string? vpa = null;
        var p2m = P2mRegex.Match(body);
        var upiId = VpaRegex.Match(body);
        var payee = type == TrackerTypes.Debit ? PayeeRegex.Match(body) : Match.Empty;

        // ICICI names the payee before "credited": "Acct XX260 debited for Rs 30.00 on 05-Sep-25; RAMESH STORE credited."
        if (payee.Success)
            raw = payee.Groups[1].Value.Trim();
        else if (p2m.Success)
            raw = p2m.Groups[1].Value.Trim();
        else if (upiId.Success)
            raw = vpa = upiId.Groups[1].Value;
        else
            foreach (var regex in type == TrackerTypes.Credit ? new[] { Words("from|by"), Words("at"), Words("for"), Words("to|towards") } : new[] { Words("at"), Words("to|towards"), Words("for") })
                if ((raw = FirstGood(regex, body)) is not null)
                    break;

        var known = (raw is not null ? Lookup(raw) : null) ?? Lookup(HeaderRegex.Replace(body, ""));

        if (known is not null)
            return known with { Raw = raw };

        if (vpa is not null)
        {
            var words = Regex.Split(Regex.Replace(vpa.Split('@')[0], @"\d+", " "), @"[._\-\s]+").Where(w => w.Length > 1).ToList();

            return words.Count > 0 ? new MerchantFound(TitleCase(string.Join(' ', words)), raw, "transfer", null, false, true) : new MerchantFound(null, raw, null, null, false, false);
        }

        if (raw is null)
            return new MerchantFound(null, null, null, null, false, false);

        var clean = Regex.Replace(raw, @"\s{2,}", " ").Trim();
        var business = Regex.IsMatch(clean, @"\b(pvt|ltd|llp|limited|store|stores|mart|general|services|enterprises|traders|shop|medical|bill|electricity|recharge|restaurant|cafe|hotel)\b", Flags);
        var person = !business && method is TrackerMethods.Upi or TrackerMethods.Neft or TrackerMethods.Imps or TrackerMethods.Rtgs or TrackerMethods.Bank && Regex.IsMatch(clean, @"^[A-Za-z]+(?: [A-Za-z]+){1,2}$");

        return new MerchantFound(TitleCase(clean), raw, person ? "transfer" : null, null, false, person);
    }

    #endregion

    // A merchant the reader found: the name shown, the text it came from, its category and kind when the dictionary or the wording tells.
    private sealed record MerchantFound(string? Name, string? Raw, string? Category, string? Kind, bool Known, bool Person);
}
