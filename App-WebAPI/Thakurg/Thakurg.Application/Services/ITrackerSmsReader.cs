using Thakurg.Contracts.Tracker;

namespace Thakurg.Application.Services;

// Reads one bank or UPI SMS: the sender (Tracker:Senders), the phone-side filters (OTP, promotion), a failed payment, then the amount, direction, method,
// account, reference, date and merchant; the category and how sure it is. The same rules as the prototype (App-Prototype/assets/js/snaptracker.js).
public interface ITrackerSmsReader
{
    bool IsOtp(string body);

    bool IsFailed(string body);

    string? SenderName(string code);

    bool IsPromotion(string body, string senderKind);

    TrackerParsedSmsDto Parse(string body, DateTime receivedAt);

    int Confidence(TrackerParsedSmsDto parsed, string category);

    string Categorize(TrackerParsedSmsDto parsed, string body, IReadOnlyDictionary<string, string> rules);

    (string Code, string Kind)? ParseSender(string sender);
}
