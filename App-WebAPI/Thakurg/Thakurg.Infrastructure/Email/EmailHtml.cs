using System.Net;

namespace Thakurg.Infrastructure.Email;

// A plain HTML e-mail body: each text becomes an encoded paragraph; Arabic mail is laid out right-to-left.
public static class EmailHtml
{
    #region Public Methods

    public static string Paragraphs(IEnumerable<string> texts, bool rightToLeft)
    {
        var paragraphs = string.Concat(texts.Select(text => "<p>" + WebUtility.HtmlEncode(text) + "</p>"));

        return "<!DOCTYPE html><html dir=\"" + (rightToLeft ? "rtl" : "ltr") + "\"><body style=\"font-family:Arial,sans-serif;font-size:15px\">" + paragraphs + "</body></html>";
    }

    #endregion
}
