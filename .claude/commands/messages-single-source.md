Replace hardcoded response/error/toast text with message codes/keys in the specified scope (App-WebAPI Thakurg and App-WebUI).

Rule (full details in document/messages-single-source.md):
- No message text typed in code. API texts live in the Messages table (Code, Texts = one JSON object with en/hi/ar); UI texts live in the Translations table (one row per page: PageCode, Eng, Hin, Arab = JSON key/value), served by GET api/translations/{lang}.
- API: `throw new BusinessException(MessageCodes.X, status, args)`; success text via `await _messageService.GetAsync(MessageCodes.X)`, returned by the controller in SuccessResponse. No sentences in controllers/services. Placeholders {0},{1} instead of interpolation.
- UI: use `i18n.t('key', params)` for every visible text (labels, buttons, headings, toasts, SEO); API messages arrive translated in the response and are shown as-is. Placeholders {name}.
- Every new API code = constant in Thakurg.Contracts/Messages/MessageCodes*.cs + a row in INSERT/Common/001_Messages.sql (en, hi, ar). Every new UI key = entry in the page's row of INSERT/Common/009_Translations.sql (Eng, Hin, Arab).
- Keep behaviour/wording identical for English. Build the API projects / UI afterwards.

Scope: $ARGUMENTS
