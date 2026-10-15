Apply the role-based portal rule in the specified scope (App-WebUI).

Rule (full details in document/role-based-portals.md):
- Active role SPRADMN / ADMN / any non-STDUSR role -> HR portal (existing app-shell, full web page).
- Active role STDUSR (standard user / employee) -> Employee portal: employee-shell under /m/**, rendered as a mobile-phone view (phone frame >= 640px wide viewports, full-screen below), top bar + scrolling body + bottom tab bar (Home, Attendance, Payslips, Profile).
- Role-code constants live in core/models/portal.model.ts; routing is enforced by guards in core/guards/portal.guard.ts (STDUSR -> /m/home, others away from /m/**).
- Employee portal must work with every theme, appearance (light/dark/system) and morphism style: style ONLY with the shared semantic tokens (--surface-color, --border-color, --text-color, --primary-color, --secondary-color, ...). No hardcoded colours or per-theme overrides. Top bar reuses the theme, appearance and morphism switchers.
- Employee screens read own data from the my-* endpoints only (my-profile, my-attendance, my-payslips).
- Also follow WebUI.md, component-file-separation.md, model-separation.md, date-format.md, html-single-line.md.

Scope: $ARGUMENTS
