using Thakurg.Application.Services;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;

namespace Thakurg.Infrastructure.Notifications;

// Sms:Provider = None: no text-message provider is set up yet, so every send fails with SmsNotConfigured (503).
// A real provider (MSG91, Twilio, ...) is another ISmsSender, registered in DependencyInjection.AddSmsSender for its Sms:Provider name.
public class NotConfiguredSmsSender : ISmsSender
{
    #region Public Methods

    public Task SendAsync(string to, string text, CancellationToken cancellationToken)
    {
        throw new BusinessException(MessageCodes.SmsNotConfigured, 503);
    }

    #endregion
}
