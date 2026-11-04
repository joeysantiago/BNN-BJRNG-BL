using Thakurg.Application.Common;
using Thakurg.Application.Services;

namespace Thakurg.Infrastructure.Common;

// Bundle of the message senders KhataNotificationService uses (App-Document/constructor-injection-limit.md).
public class KhataMessageSenders : IKhataMessageSenders
{
    public ISmsSender Sms { get; }

    public IEmailSender Email { get; }

    public IWhatsAppSender WhatsApp { get; }

    public KhataMessageSenders(IEmailSender email, ISmsSender sms, IWhatsAppSender whatsApp)
    {
        Email = email;
        Sms = sms;
        WhatsApp = whatsApp;
    }
}
