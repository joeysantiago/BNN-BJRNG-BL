namespace Thakurg.Contracts.Khata;

// Which messages a party gets when an entry on their account is added, changed or deleted: in the app, by SMS, by e-mail, by WhatsApp.
public class ContactNotifyDto
{
    public bool App { get; set; }

    public bool Sms { get; set; }

    public bool Email { get; set; }

    public bool WhatsApp { get; set; }
}
