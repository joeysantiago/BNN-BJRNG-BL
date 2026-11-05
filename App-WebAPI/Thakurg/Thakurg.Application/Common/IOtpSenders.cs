using Thakurg.Application.Services;

namespace Thakurg.Application.Common;

// The senders a one-time code can go by (OtpService): e-mail, SMS and WhatsApp.
public interface IOtpSenders
{
    ISmsSender Sms { get; }

    IEmailSender Email { get; }

    IWhatsAppSender WhatsApp { get; }
}
