using Thakurg.Application.Services;

namespace Thakurg.Application.Common;

// The ways a party is sent a message about an entry: e-mail, SMS and WhatsApp.
public interface IKhataMessageSenders
{
    ISmsSender Sms { get; }

    IEmailSender Email { get; }

    IWhatsAppSender WhatsApp { get; }
}
