using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Tracker;

namespace Thakurg.Application.Services;

// Reads one bank or UPI SMS: the sender (Tracker:Senders), the phone-side filters (OTP, promotion), a failed payment, then the amount, direction, method,
// account, reference, date and merchant; the category and how sure it is. The same rules as the prototype (App-Prototype/assets/js/snaptracker.js).
// A merchant's own "payment received" SMS (Tracker:MerchantSenders) is only recognised and named: it confirms a bank's transaction.
public interface ITrackerSmsReader
{
    bool IsOtp(string body);

    bool IsFailed(string body);

    string? BankCode(string code);

    string? SenderName(string code);

    TrackerDueDto? Due(string body);

    bool IsConfirmation(string body);

    bool Names(string text, string merchant);

    bool IsPromotion(string body, string senderKind);

    string? Skip(string body, TrackerOwnerDto owner);

    (string Code, string Kind)? ParseSender(string sender);

    TrackerMerchantSenderOptions? MerchantSender(string code);

    TrackerParsedSmsDto Parse(string body, DateTime receivedAt);

    int Confidence(TrackerParsedSmsDto parsed, string category, bool ruled);

    string Flow(TrackerParsedSmsDto parsed, string body, TrackerOwnerDto owner);

    string Categorize(TrackerParsedSmsDto parsed, string body, IReadOnlyDictionary<string, string> rules);
}
