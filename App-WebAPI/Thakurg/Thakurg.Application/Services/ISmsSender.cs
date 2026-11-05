namespace Thakurg.Application.Services;

// Sends one text message to a mobile number in E.164 form (+919876543210). The provider is chosen by Sms:Provider.
public interface ISmsSender
{
    Task SendAsync(string to, string text, CancellationToken cancellationToken);
}
