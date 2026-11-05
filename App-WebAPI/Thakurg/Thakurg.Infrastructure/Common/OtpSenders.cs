using Thakurg.Application.Common;
using Thakurg.Application.Services;

namespace Thakurg.Infrastructure.Common;

public class OtpSenders : IOtpSenders
{
    public ISmsSender Sms { get; }

    public IEmailSender Email { get; }

    public IWhatsAppSender WhatsApp { get; }

    public OtpSenders(IEmailSender email, ISmsSender sms, IWhatsAppSender whatsApp)
    {
        Email = email;
        Sms = sms;
        WhatsApp = whatsApp;
    }
}
