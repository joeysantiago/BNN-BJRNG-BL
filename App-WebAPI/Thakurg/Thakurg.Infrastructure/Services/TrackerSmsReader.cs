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

    private static readonly Regex AccountRegex = new(@"(?:a\/c|acct|account|card)(?:\s*no\.?)?\s*(?:ending(?:\s*with)?\s*)?[x*]+\s?(\d{3,6})", Flags);

    private static readonly Regex OtpWordRegex = new(@"\b(otp|one[- ]time password|verification code|security code|auth(?:entication)? code)\b", Flags);

    private static readonly Regex DoneRegex = new(@"\b(debited|credited|withdrawn|spent|deposited|has been (?:paid|sent|received))\b", Flags);

    private static readonly Regex TransactionRegex = new(@"\b(debited|credited|spent|withdrawn|deposited|sent|paid|received|refund(?:ed)?)\b", Flags);

    private static readonly Regex AmountAltRegex = new(@"\b(?:debited|credited)\s+(?:by|with|for)\s+(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)", Flags);

    private static readonly Regex CreditRegex = new(@"\b(credited|received|deposited|refund(?:ed)?|reversed|added to)\b", Flags);

    private static readonly Regex FailedRegex = new(@"\b(failed|declined|unsuccessful|not successful|could not be (?:processed|completed))\b", Flags);

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
        var amountMatch = AmountAltRegex.Match(body) is { Success: true } alt ? alt : AmountRegex.Match(body);
        var amount = amountMatch.Success && decimal.TryParse(amountMatch.Groups[1].Value.Replace(",", ""), NumberStyles.Number, CultureInfo.InvariantCulture, out var value) ? value : 0;
        var isRefund = Regex.IsMatch(body, @"\b(refund(?:ed)?|reversed|reversal)\b", Flags);
        var debitAt = DebitRegex.Match(body) is { Success: true } d ? d.Index : -1;
        var creditAt = CreditRegex.Match(body) is { Success: true } c ? c.Index : -1;
        var type = isRefund && creditAt >= 0 ? TrackerTypes.Credit : debitAt >= 0 && (creditAt < 0 || debitAt < creditAt) ? TrackerTypes.Debit : creditAt >= 0 ? TrackerTypes.Credit : null;
        var method = Method(body);
        var account = AccountRegex.Match(body);
        var reference = ReferenceRegexes.Select(r => r.Match(body)).FirstOrDefault(m => m.Success && m.Groups[1].Value.Any(char.IsDigit));
        var (at, dateFound) = ParseDate(body, receivedAt);
        var merchant = type is null ? new MerchantFound(null, null, null, null, false, false) : ExtractMerchant(body, type, method);

        return new TrackerParsedSmsDto
        {
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

        if (p2m.Success)
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
