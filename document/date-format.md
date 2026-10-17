Date display format for all UI (App-WebUI).

Rule:
- Any date shown in the UI must be formatted as `DD-MM-YYYY` only.
- Do not include time, timezone, or any other date format (no `MM-DD-YYYY`,
  no ISO `YYYY-MM-DD`, no long/localized forms like `March 5, 2026`).
- Applies to table columns, form fields, labels, tooltips, exports (PDF/CSV/XLSX),
  and any other place a date is rendered to the user.
- Underlying data models, APIs, and stored values are unaffected — this rule
  only governs display/formatting in the UI layer.

Example:
- Correct: `03-09-2026`
- Incorrect: `2026-09-03`, `09/03/2026`, `September 3, 2026`

## Exception: Last Login

The "System Information" panel's Last Login timestamp (`SystemInfoRow.type === 'datetime'` in
`entity-form-page.component.ts`/`.html`) is the one deliberate exception to "no time, no timezone" -
it shows date, time, and the full named timezone, because knowing *when* someone last signed in is
the point of that field:
```
26/10/2026 05:30 PM India Standard Time
```
Built manually in `formatDateTimeWithZone()` (not via DatePipe, which only offers a `GMT+05:30`-style
offset, not the named zone) using `Intl.DateTimeFormat(..., { timeZoneName: 'long' })` to read the
viewer's own local timezone name, so it's correct wherever the browser is rather than hardcoded to
one zone. This exception is scoped to Last Login only - every other date in the app (Created On/
Modified On included) stays plain `DD-MM-YYYY`.
