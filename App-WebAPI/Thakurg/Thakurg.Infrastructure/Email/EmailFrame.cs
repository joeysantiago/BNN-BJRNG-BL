namespace Thakurg.Infrastructure.Email;

// What surrounds every e-mail's content (EmailHtml): the brand on top, the footer line and the reading direction.
public class EmailFrame
{
    public bool RightToLeft { get; set; }

    public string Brand { get; set; } = string.Empty;

    public string Footer { get; set; } = string.Empty;
}
