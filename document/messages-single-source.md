# Messages — Single Source (App-WebAPI + App-WebUI)

Applies to the `Thakurg` API and `App-WebUI`.

## Rule

**No response, error, validation or on-screen text is typed in code.** Every such text lives in the database, in one of two tables, and code refers only to a **code** or **key**:

| Text | Table | Row shape | Read by |
|---|---|---|---|
| Texts the **API** sends (errors and success messages in `ApiResponse.message`) | `Messages` | One row per code: `Code`, `Texts` = one JSON object with every language, e.g. `{"en":"This track was not found.","hi":"…","ar":"…"}` | `IMessageService` |
| Texts the **UI** shows (labels, headings, buttons, page copy, SEO titles/descriptions, toasts) | `Translations` | One row per page: `PageCode`, `Eng`, `Hin`, `Arab`; each of the three columns is a JSON object of key → text | `GET api/translations/{en\|hi\|ar}` → `I18nService.t(key)` |

Supported languages are English (`en`), Hindi (`hi`) and Arabic (`ar`, right-to-left). A language with no text for a key falls back to English. Never hardcode a sentence in a controller, service, component or template.

- **Codes** are `UPPER_SNAKE_CASE` constants kept in one place: `Thakurg.Contracts/Messages/MessageCodes*.cs` (partial static class `MessageCodes`, one file per area: general, `.Music`, `.YouTube`).
- **UI keys** are flat dotted keys (`st.start`, `creta.add.h1`, `seo.home.title`, `cfg.pw.rule`); the row of the page that uses them holds them. Common header/footer texts live in the `common` row.
- **Adding an API message** = add the code constant **and** a row in `INSERT/Common/001_Messages.sql` with the text in **every** language (`en`, `hi`, `ar`).
- **Adding a UI text** = add the key to the right page row in `INSERT/Common/009_Translations.sql` in **all three** columns (`Eng`, `Hin`, `Arab`), and use `i18n.t('key')` in the component. For an existing database, update the row there too (the seed script only fills an empty table).
- **Placeholders:** use `{0}`, `{1}` (API) or `{name}` (UI) in the text and pass values as arguments — never concatenate/interpolate text in code.

## API

- Throw `new BusinessException(MessageCodes.MusicTrackNotFound, 404)` — never `new BusinessException("Track not found.")`. `ExceptionMiddleware` resolves the code to the caller's language from `Accept-Language` (fallback `en`) and returns it in `ApiResponse<T>.FailureResponse`.
- Success messages: services get the text with `await _messageService.GetAsync(MessageCodes.MusicTrackDeleted)` and the controller returns it in `ApiResponse<T>.SuccessResponse(data, message)`. Controllers never contain message text.
- `ApiResponse<T>` has no hardcoded default text.
- Rate-limit rejections (`TOO_MANY_REQUESTS`) use the same message service.

## UI

- API-originated messages arrive already translated in `ApiResponse.message` / the error body — show them as-is.
- Texts the UI itself shows come from `I18nService.t(key, params)`; no string literals in templates, toasts or error properties. The three languages are loaded once at startup through `provideAppInitializer` and served from memory.
- Language names/native names and text direction (`LANGS` in `core/site.ts`) are configuration, not translatable text, and may stay in code.

## Why

One place to review, reword, refactor and translate every text; adding a language is adding a JSON key, not changing code.

## Checklist

1. New API message → code constant + `Messages` seed row in every language.
2. New UI text → key in the page's `Translations` row in `Eng`, `Hin` and `Arab`; `i18n.t(key)` in the component.
3. No quoted sentence in `BusinessException`, `SuccessResponse`, `FailureResponse`, components or templates.
4. Placeholders instead of string interpolation.
