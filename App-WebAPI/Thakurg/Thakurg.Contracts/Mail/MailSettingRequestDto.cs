namespace Thakurg.Contracts.Mail;

// PUT api/admin/mail/{purpose}. A blank Password keeps the saved one.
public class MailSettingRequestDto
{
    public int Port { get; set; }

    public bool Enabled { get; set; }

    public string? Host { get; set; }

    public string? FromName { get; set; }

    public string? Password { get; set; }

    public string? Security { get; set; }

    public string? UserName { get; set; }

    public string? FromAddress { get; set; }
}
