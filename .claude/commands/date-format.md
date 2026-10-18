Format every date shown in the UI as `DD-MM-YYYY` in the specified scope (App-WebUI).

Rule (full details in App-Document/date-format.md):
- Any date shown to the user is `DD-MM-YYYY` only — no time, no timezone, no `MM-DD-YYYY`, no ISO `YYYY-MM-DD`, no long/localized forms (`March 5, 2026`).
- Applies to table columns, form fields, labels, tooltips, exports (PDF/CSV/XLSX) and any other place a date is rendered.
- Data models, APIs and stored values are unaffected — only the display layer changes.
- The one documented exception is the Last Login timestamp, which shows date, time and the named timezone (see the document). Created On / Modified On stay `DD-MM-YYYY`.
- Texts still come from i18n (see messages-single-source). Build with `ng build` afterwards.

Example:
- Correct: `03-09-2026`
- Incorrect: `2026-09-03`, `09/03/2026`, `September 3, 2026`

Scope: $ARGUMENTS
