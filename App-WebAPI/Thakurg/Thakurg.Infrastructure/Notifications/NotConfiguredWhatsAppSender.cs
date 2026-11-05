using Thakurg.Application.Services;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;

namespace Thakurg.Infrastructure.Notifications;

// WhatsApp:Provider = None: no WhatsApp Business provider is set up yet, so every send fails with WhatsAppNotConfigured (503).
// A real provider (Meta Cloud API, Gupshup, Twilio, ...) is another IWhatsAppSender, registered in DependencyInjection.AddWhatsAppSender for its WhatsApp:Provider name.
public class NotConfiguredWhatsAppSender : IWhatsAppSender
{
    #region Public Methods

    public Task SendAsync(string to, string text, CancellationToken cancellationToken)
    {
        throw new BusinessException(MessageCodes.WhatsAppNotConfigured, 503);
    }

    #endregion
}
