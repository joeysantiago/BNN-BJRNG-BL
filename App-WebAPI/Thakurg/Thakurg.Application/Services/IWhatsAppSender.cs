namespace Thakurg.Application.Services;

// Sends one WhatsApp message to a mobile number in E.164 form (+919876543210). The provider is chosen by WhatsApp:Provider.
public interface IWhatsAppSender
{
    Task SendAsync(string to, string text, CancellationToken cancellationToken);
}
