using System.Net;
using Thakurg.Application.Services;
using Thakurg.Contracts.Messages;

namespace Thakurg.Infrastructure.Email;

// The HTML of every e-mail: a white card with the brand bar on top and the "automatic message" footer, built from tables and inline styles so that
// Gmail, Outlook and phone mail apps show it the same way. Every text is HTML-encoded; Arabic mail is laid out right-to-left.
public static class EmailHtml
{
    private const string Accent = "#1f6f5c";

    private const string Font = "Segoe UI,Tahoma,Arial,sans-serif";

    private const string Spacer = "<tr><td style=\"height:10px;line-height:10px;font-size:0;\">&nbsp;</td></tr>";

    // Background and bar colour of the highlighted line.
    private static readonly Dictionary<EmailTone, string[]> Tones = new() { [EmailTone.Neutral] = ["#f1f3f5", "#868e96"], [EmailTone.Success] = ["#ebfbee", "#2f9e44"], [EmailTone.Warning] = ["#fff9db", "#f08c00"], [EmailTone.Danger] = ["#fff4f4", "#d9480f"] };

    #region Public Methods

    public static string Paragraphs(EmailFrame frame, IEnumerable<string> texts)
    {
        return Notice(frame, null, texts, null, EmailTone.Neutral);
    }

    // A one-time code: the lead line, the code large in a dashed box, then the note (how long it works).
    public static string Code(EmailFrame frame, string lead, string code, string note)
    {
        var box = "<tr><td align=\"center\" style=\"padding:8px 24px 16px;\"><div dir=\"ltr\" style=\"display:inline-block;background:#eef7f4;border:1px dashed " + Accent + ";border-radius:8px;padding:14px 28px;font-size:32px;font-weight:700;letter-spacing:8px;color:" + Accent + ";font-family:Consolas,'Courier New',monospace;\">" + Encode(code) + "</div></td></tr>";

        return Card(frame, Row("padding:28px 24px 8px;color:#212529;font-size:16px;line-height:1.5;", lead) + box + Row("padding:0 24px 24px;color:#495057;font-size:15px;line-height:1.5;", note));
    }

    // The brand, the footer and the direction of a mail written in this language.
    public static async Task<EmailFrame> FrameAsync(IMessageService messages, string language)
    {
        var brand = await messages.GetInAsync(language, MessageCodes.EmailBrand);
        var footer = await messages.GetInAsync(language, MessageCodes.EmailFooter, brand);

        return new EmailFrame { Brand = brand, Footer = footer, RightToLeft = language == "ar" };
    }

    // A notice: an optional small label (who it is from), the lines, and an optional highlighted line in the tone's colours.
    public static string Notice(EmailFrame frame, string? label, IEnumerable<string> lines, string? highlight, EmailTone tone)
    {
        var rows = label is null ? string.Empty : Row("padding:24px 24px 6px;color:#868e96;font-size:13px;text-transform:uppercase;letter-spacing:.05em;", label);
        rows += string.Concat(lines.Select((line, index) => Row("padding:" + (index == 0 && label is null ? "24px" : "0") + " 24px 14px;color:#212529;font-size:16px;line-height:1.5;", line)));

        if (highlight is null)
            return Card(frame, rows + Spacer);

        var colours = Tones[tone];
        var side = frame.RightToLeft ? "right" : "left";
        rows += "<tr><td style=\"padding:4px 24px 24px;\"><div style=\"background:" + colours[0] + ";border-" + side + ":4px solid " + colours[1] + ";border-radius:6px;padding:14px 16px;color:#212529;font-size:16px;font-weight:600;line-height:1.5;\">" + Encode(highlight) + "</div></td></tr>";

        return Card(frame, rows);
    }

    #endregion

    #region Private Methods

    private static string Encode(string text)
    {
        return WebUtility.HtmlEncode(text);
    }

    private static string Row(string style, string text)
    {
        return "<tr><td style=\"" + style + "\">" + Encode(text) + "</td></tr>";
    }

    private static string Card(EmailFrame frame, string rows)
    {
        var direction = frame.RightToLeft ? "rtl" : "ltr";
        var start = frame.RightToLeft ? "right" : "left";
        var head = "<!DOCTYPE html><html dir=\"" + direction + "\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"></head><body style=\"margin:0;padding:0;background:#f4f6f8;\">";
        var open = "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f4f6f8;padding:24px 12px;font-family:" + Font + ";\"><tr><td align=\"center\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:480px;background:#ffffff;border:1px solid #e3e7eb;border-radius:10px;text-align:" + start + ";\">";
        var brand = "<tr><td style=\"background:" + Accent + ";padding:18px 24px;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:.5px;border-radius:10px 10px 0 0;\">" + Encode(frame.Brand) + "</td></tr>";
        var footer = "<tr><td style=\"padding:14px 24px;background:#f8f9fa;border-top:1px solid #e3e7eb;color:#868e96;font-size:12px;line-height:1.5;border-radius:0 0 10px 10px;\">" + Encode(frame.Footer) + "</td></tr>";

        return head + open + brand + rows + footer + "</table></td></tr></table></body></html>";
    }

    #endregion
}
