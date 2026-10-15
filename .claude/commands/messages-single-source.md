Replace hardcoded response/error/toast text with message codes in the specified scope (App-WebAPI Generic/HRMS/IMS and App-WebUI; never FileDropper).

Rule (full details in document/messages-single-source.md):
- No message text typed in code. Texts live in the Messages table (Code, Texts = one JSON object with every language), edited from Settings -> Configurations -> Resource Management.
- API: `throw new BusinessException(MessageCodes.X, status, args)`; success text via `await _messageService.GetAsync(MessageCodes.X)` (ISettingsServices.Messages), returned by the controller in SuccessResponse. No sentences in controllers/services. Placeholders {0},{1} instead of interpolation.
- UI: toasts/inline errors use `MessageTextService.get(UiMessageCodes.X, ...args)`; API messages arrive translated in the response and are shown as-is.
- Every new code = constant (MessageCodes.*.cs / HrmsMessageCodes / ImsMessageCodes / UiMessageCodes) + English row in the Messages seed script.
- Keep behaviour/wording identical for English. Build the API projects / UI afterwards.

Scope: $ARGUMENTS
