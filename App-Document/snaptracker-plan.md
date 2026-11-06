# SnapTracker: build plan (`/tracker`)

**Status:** plan for review. No code yet. Answer the decisions in [section 2](#2-decisions-for-the-owner) and building starts from phase 1.
**Branch:** `Features/App/Tracker`, folder `thakurg-branches\SnapTracker` (see [section 11](#11-branch-and-merge-notes)).
**Screens:** [`snaptracker-screens.md`](snaptracker-screens.md).
**Source:** the prototype `App-Prototype/pages/snaptracker.html` and `assets/js/snaptracker.js`, built the same way as SnapKhata and My Tasks.

---

## 1. What SnapTracker is

An expense tracker that fills itself. Banks and UPI apps send an SMS for every payment. SnapTracker reads only those alerts and turns each one into a transaction:
- **What it works out:** amount, debit or credit, merchant, category, method, the account's last 4 digits and the reference.
- **What it writes:** a plain-language description, for example *"You spent ₹450 on food at Zomato."*
- **What it filters out:** duplicate alerts (bank SMS plus UPI-app SMS for the same payment), OTPs, promotions and failed payments.
- **Khata link:** if you choose, confirmed transactions post to a SnapKhata book.

What the prototype has, and what the real app keeps:

| Prototype screen | Real app |
|---|---|
| Dashboard: month spend, today, income, KPIs, 6-month bars, category donut, "needs your check", recently detected | **Kept** as `/tracker/app` |
| Transactions: filters, search, grouped by day, detail drawer (confirm, ignore, edit, category, not a duplicate, delete, original SMS with highlights) | **Kept** as `/tracker/app/transactions` |
| Privacy: tracking on/pause/revoke, what is and isn't read, filter counts, supported banks | **Kept** as `/tracker/app/privacy` (the "your data" buttons move to Profile) |
| Alerts (notifications list + preferences) | **List kept** as `/tracker/app/alerts`; **preferences move to Settings › General** |
| Settings (approval mode, threshold, Khata link, appearance, account, activity) | **Moves to the shared Settings › General › SnapTracker section**; appearance and language are the shared top-bar menus; account is `/profile` |
| How it works | **Kept** as `/tracker/app/how` |
| Simulated Android device | **Replaced** by real ways to get SMS in: paste, Android share, Android app (decision Q1) |
| Own theme toggle, English only | **Replaced** by the shared theme and language menus; every text in English, Hindi and Arabic |

---

## 2. Decisions for the owner

Each decision has a recommendation. Reply with the number and your choice, for example "Q1 A, Q2 yes, …".

| # | Question | Options | Recommended |
|---|---|---|---|
| **Q1** | How do SMS messages reach SnapTracker? A website **cannot read SMS**, and an installed web app (or a TWA wrapper) cannot either. | **A.** Phase 1 on the web: paste an SMS, or **Share** it to the installed app on Android (no native code). Add the native Android app later.<br>**B.** Build the native Android receiver now (Kotlin, `RECEIVE_SMS`). It needs Android Studio, and the Google Play SMS-permission declaration ("SMS-based money management" use) |  **A**: it works for free right away, and B is phase 4 |
| **Q2** | Post confirmed transactions to SnapKhata? | Yes or no. It only works where both apps are installed (`banni-linux`); in the Tracker branch the switch is hidden | **Yes, phase 3**, through a small shared interface (section 6.4) |
| **Q3** | Icons and colour tokens: share them or copy them? Khata and My Tasks each have their own copy (`khata-icons.ts` with prerender-safe shapes; `tasks-icons.ts` with SVG text; the `--k-*` tokens copied as `.khata` and `.mt`) | **A.** Copy Khata's icon format and the token and skin blocks into `.st`, like My Tasks did<br>**B.** Move one shared `app-icon` component, plus one shared token and skin file, into `matrix`, then switch Khata, My Tasks and Tracker to them | **B**: one icon set, so the icons really are identical, and a new skin like Agni is added once instead of three times. If you want Tracker first, choose A now and B later |
| **Q4** | An app PIN or lock like SnapKhata and My Tasks? | Yes or no | **No.** The prototype has none, and the shared login protects it. It can be added later |
| **Q5** | Keep the original SMS text? | **A.** Keep it encrypted, deletable by the user (prototype behaviour)<br>**B.** Keep it 90 days, then delete it automatically<br>**C.** Never keep it | **A**, with "Delete original SMS texts" on Profile |
| **Q6** | Money type | INR only, or a currency per transaction | **INR only** (Indian bank SMS); the column is still there for later |
| **Q7** | Can a super admin manage the bank-sender list and the merchant dictionary? | Fixed lists in the seed scripts, or editable in Settings (super admin) | **Seed scripts first**, editable list in phase 3 |
| **Q8** | App name | "SnapTracker" (renamable in Settings like every app) | **SnapTracker**: add its `PageNames` rows |

---

## 3. Looks the same as SnapKhata and My Tasks (requirement 1)

| Part | How Tracker gets it |
|---|---|
| **Theme, language and install menus** in the top bar | The **same shared component** `<app-site-tools />` that Khata and My Tasks use, so they're identical, not copies |
| **Skins** (Agni default, Glass, Clay, Skeu, Neu; light and dark) | Same `--k-*` tokens, same values. Root `.st` with `data-ks` (skin) and `data-kt` (brightness), like `.khata` and `.mt` (or the shared file, Q3 B) |
| **Icons** | The same 24 × 24 line icons, drawn the same way as Khata's (`home`, `list`, `user`, `plus`, `search`, `bell`, `gear`, `shield`, …), plus a few new ones (`sms`, `spark`, `copies`, `sync`, `pause`, `play`) in the same style |
| **Layout** | Same frame as My Tasks: left rail on desktop (≥ 1024 px), top bar (logo, page name, bell, site tools), bottom tab bar on phones with the centre **＋** button, avatar link to `/profile` |
| **Page frame** | Like Khata and My Tasks, the site header and footer are hidden inside `/tracker/app` (the app has its own bars). `app.ts` `bare` adds `tracker/app` |
| **Shared bits** | `ToastService` + `SiteToasts`, `ChoiceGroup` for one-of-many choices, `app-user-avatar`, DD-MM-YYYY dates, 44 px tap targets, works at 320 px |

---

## 4. Shared Profile and Settings (requirement 3)

Tracker has **no settings or profile page of its own**, just like My Tasks. The old prototype addresses redirect:
- `/tracker/app/settings` → `/master?tab=general&app=tracker`
- `/tracker/app/profile` → `/profile`

### 4.1 Settings › General › SnapTracker section (`FEATURE_SETTINGS`)

`pages/tracker/settings-panel/tracker-settings-panel.*`, loaded lazily:
- **App name** (super admin, en, hi, ar): the shared rename form, already part of every app section.
- **Automatic approval:** a ChoiceGroup with *Review everything* / *Smart (recommended)* / *Approve all*. With Smart, there's also *Auto-approve at __ % confidence or more* (default from `appsettings.json`).
- **SnapKhata link** (only when the Khata app is in this build, Q2):
  - *Post confirmed transactions to Khata* (switch)
  - *Default Khata book* (dropdown of the user's books)
- **Alerts:** one switch for *Push notifications on the phone*, plus one switch per alert type: new transaction, auto-categorised, needs verification, duplicate, tracking revoked, paused/resumed, sync completed.
- **Super admin only** (phase 3, Q7): supported banks / SMS senders, and the merchant dictionary.

### 4.2 Profile › SnapTracker part (`FEATURE_PROFILE`)

`pages/tracker/profile-panel/tracker-profile-panel.*`:
- **Your data:**
  - *"N transactions keep their original SMS text"*
  - **Download my data (JSON)**
  - **Delete original SMS texts, keep transactions**
  - **Delete all SnapTracker data** (confirm dialog)
- **Connected phones** (phase 4): name, last seen, **Disconnect**.
- Name, language, password and avatar stay in the shared profile.

---

## 5. Getting SMS in (decision Q1)

```
 Phone                                  Server (Thakurg API)                         App (Angular)
 ─────                                  ────────────────────                         ─────────────
 A. Paste SMS text  ─────────────────►  POST /api/tracker/sms                        Dashboard / Activity
 B. Android "Share" → SnapTracker ────►   1. sender check (bank / UPI list)          update; toast
    (installed app, Web Share Target)     2. OTP / promotion / failed → skipped
 C. Android app receiver (phase 4) ───►   3. parse → categorise → describe
    (RECEIVE_SMS, phone-side filters,     4. duplicate check (ref, same text,
     queued upload, device token)            amount ± 10 min)
                                          5. approve by mode + threshold
                                          6. (Q2) post to Khata
```

- **A. Paste** (phase 1): the **＋** button opens *Add*, with two tabs: *Paste an SMS* and *Enter manually*. Pasting shows the result straight away: what was found, or why it was skipped. These are the prototype's "What happened" steps, kept as a teaching aid.
- **B. Share to the app** (phase 2):
  - The installed app's manifest (`/apps/tracker/manifest.webmanifest`) declares a **`share_target`**, so on Android, long-press an SMS → **Share** → **SnapTracker**.
  - The app opens at `/tracker/app/share?text=…` and sends the text to the API.
  - Works only in the **installed** app on Android (Chrome/Edge). The text never goes into a URL that leaves the phone: the page reads it and POSTs it.
- **C. Android app** (phase 4, Q1 B):
  - Native Kotlin receiver: only `RECEIVE_SMS`, no inbox scan; filters on the phone; encrypted WorkManager queue.
  - Sign-in by pairing a device token from the web app (Profile › Connected phones).
  - Requests are signed (token + timestamp + nonce, refused if older than 5 minutes or replayed).
  - Google Play needs the SMS-permission declaration.
- **What the server never accepts or keeps:** OTP messages, which are dropped even if pasted, and anything that isn't from a listed sender.

---

## 6. Data and API

### 6.1 Tables (`SqlScripts/CREATE/Tracker/`, new `TrackerDatabaseSeeder`, rule `sql-app-folders.md`)

All of these follow the project rules:
- `Id INT IDENTITY(1,1)`, INT foreign keys.
- Money in `BIGINT` minor units (paise).
- The standard columns `IsActive`, `IsSoftDeleted`, `IsDeleted`, `CreatedBy`, `CreatedOn`, `ModifiedBy`, `ModifiedOn`.
- Aligned column grid.
- No ALTER scripts.

| # | Table | Purpose and main columns |
|---|---|---|
| 001 | `TrackerUsers` | One row per user: `UserId`, `TrackingState` (permission / enabled / paused), `TrackingSince`, `ApprovalMode`, `AutoApprovePercent`, `KhataAutoPost`, `KhataBookId`, `PushEnabled`, `AlertTypes` (JSON of on/off), `LastSyncOn` |
| 002 | `TrackerCategories` | Master: `Code` (food, groceries, …, other), `Color`, `Icon`, `SortOrder`. Names come from translation keys `tracker.cat.<code>` |
| 003 | `TrackerSenders` | Master: SMS header (`HDFCBK`, `PHONPE`, …), `BankName`, `SortOrder` |
| 004 | `TrackerMerchants` | Master dictionary: `Pattern`, `DisplayName`, `CategoryId`, `Kind` (subscription / electricity / telecom) |
| 005 | `TrackerTransactions` | `UserId`, `Source` (sms / share / manual), `Type` (debit / credit), `TypeGuessed`, `AmountMinor`, `CurrencyCode`, `Merchant`, `CategoryId`, `Kind`, `Method`, `AccountLast4`, `Reference`, `OccurredOn`, `Confidence`, `Status` (pending / confirmed / auto / ignored / duplicate), `Note`, `IsEdited`, `DuplicateOfId` (self FK), `DuplicateReason`, `KhataTransactionId` (plain INT, no FK: the Khata table isn't in this branch) |
| 006 | `TrackerSmsTexts` | One per SMS transaction, deletable separately (Q5): `TransactionId`, `SenderHeader`, `BodyEncrypted`, `ReceivedOn`, `Marks` (JSON of highlighted parts) |
| 007 | `TrackerCategoryRules` | What the user taught: `UserId`, `MerchantKey`, `CategoryId` ("always put this merchant in…") |
| 008 | `TrackerFilterCounts` | `UserId`, `Otp`, `Promo`, `Failed`, `Other`: what was ignored, for the Privacy page |
| 009 | `TrackerAlerts` | `UserId`, `Type`, `TransactionId`, `Args` (JSON), `IsRead`. The text is built from translation keys, so it's never stored as a sentence |
| 010 | `TrackerActivity` | `UserId`, `Event`, `Detail`: the Settings "Activity" list of the prototype |
| 011 | `TrackerDevices` | Phase 4: `UserId`, `DeviceName`, `TokenHash`, `LastSeenOn` |

**Seed scripts** in `INSERT/Tracker/` (numbered from `001`): categories, senders (19 headers from the prototype), merchants (about 40 from the prototype).
**Shared rows** stay in Common's INSERT files: `PageNames` (`tracker`), `Translations` (new page row `tracker`), `Messages` (`TRACKER_*`), `AppSettings` (defaults if needed). `Apps` already has `tracker`.

### 6.2 Settings in `appsettings.json` (no defaults in models)

`Tracker`:
- `DefaultApprovalMode`: `smart`
- `DefaultAutoApprovePercent`: `85`
- `DuplicateWindowMinutes`: `10`
- `MaxSmsLength`: `1000`
- `MaxPastePerMinute`: `20`
- `ExportMaxRows`
- `Limits` (merchant / note lengths)

### 6.3 API (`Thakurg.API`, Controller → Service → Repository, `[Authorize(Policy = tracker app)]`, every query filtered by the signed-in user)

| Method and path | What it does |
|---|---|
| `GET /api/tracker/summary` | Dashboard numbers: month, today, income, KPIs, 6 months, categories, pending list, recent |
| `GET /api/tracker/transactions?f=&q=&page=` | List with the filters (all, sms, manual, pending, credit, debit, dup, ignored) and search |
| `GET /api/tracker/transactions/{id}` | One transaction, with its SMS text and highlights |
| `POST /api/tracker/sms` | Paste or share: the full pipeline. The answer has the outcome and its steps (created / duplicate / skipped and why) |
| `POST /api/tracker/transactions` | Add manually |
| `PUT /api/tracker/transactions/{id}` | Edit (amount, merchant, category, method, date, note) |
| `POST /api/tracker/transactions/{id}/confirm`, `/ignore`, `/restore`, `/not-duplicate` | Status changes (and the Khata post or removal, Q2) |
| `PUT /api/tracker/transactions/{id}/category` (+ `rememberMerchant`) | Category, optionally learned as a rule |
| `DELETE /api/tracker/transactions/{id}` | Delete (and its Khata entry) |
| `POST /api/tracker/tracking/{enable\|pause\|resume\|revoke}` | Tracking state |
| `GET/PUT /api/tracker/settings` | The Settings › General section |
| `GET /api/tracker/alerts`, `POST /api/tracker/alerts/read` | Alerts list, mark read |
| `GET /api/tracker/export` | My data as JSON |
| `DELETE /api/tracker/sms-texts`, `DELETE /api/tracker/data` | Profile actions |
| `GET /api/tracker/meta` | Categories, senders and methods for the forms |

**The parser** (`TrackerSmsParser`, `TrackerCategorizer`, `TrackerDuplicateFinder`) is a C# port of the prototype's rules. It gets a **small xUnit test project** (`Thakurg.Tests`), which doesn't exist yet. Its cases are the prototype's 13 sample SMS with their expected outcomes, so the rules can't silently break.

**Descriptions are not stored as text.** The API returns the parts (type, kind, category, merchant, amount), and the UI builds the sentence from keys like `tracker.desc.food` = *"You spent {amount} on food at {merchant}."* in the user's language.

### 6.4 The Khata link (Q2, phase 3)

- **The problem:** Tracker and Khata live on different branches, and Tracker code must build without Khata.
- **The bridge:** `matrix` gets one small interface, `ILedgerPoster`:
  - `PostAsync(userId, bookId, type, amount, date, note)` → entry id
  - `RemoveAsync(entryId)`
  - `ListBooksAsync(userId)`
  - plus a "not installed" implementation.
- **Khata's side:** the Khata branch registers the real implementation.
- **Tracker's side:** it only calls the interface. In the Tracker branch alone, the "not installed" version hides the Khata settings. In `banni-linux` both are present and posting works.

---

## 7. Texts, SEO and the public page

- **Texts:** every visible text uses `i18n.t('tracker.…')` in en, hi and ar.
  - Screens: new `tracker` row in `007_Translations.sql`.
  - API messages: `TRACKER_*` codes in `MessageCodes.Tracker.cs` and `001_Messages.sql`.
  - Category names, alert texts and descriptions are keys too.
  - The prototype's English is kept word for word.
- **Public page** `/tracker` (prerendered; in `tracker.pages.json` and the sitemap), built like `/khata` and `/tasks`:
  - The pitch, privacy promises, how it works, a FAQ, and *Open SnapTracker* / *Sign up*.
  - **SEO:** `SeoService` title, description, canonical and OG image (`public/og/tracker.png`); JSON-LD `WebApplication` + `FAQPage`; `hreflang` en/hi/ar.
  - The app pages under `/tracker/app` need a login and are not indexed.
- **Installable:** `/apps/tracker/`, with its own manifest, icons and theme colour. Phase 2 adds the share target.

---

## 8. Files to add (Tracker branch)

```
App-WebUI/src/app/
  feature-routes.ts                      FEATURE_ROUTES, FEATURE_PAGES, FEATURE_SETTINGS, FEATURE_PROFILE get the tracker entries
  app.ts                                 bare: + tracker/app
  core/tracker-api.service.ts            calls of section 6.3
  core/tracker-state.service.ts          signals: summary, transactions, filters, alerts, drawer
  core/tracker-icons.ts                  (or the shared icons, Q3 B)
  core/models/tracker.model.ts
  pages/tracker/
    tracker.routes.ts  tracker.pages.json
    landing/        tracker-landing.*        public page /tracker
    shell/          tracker-shell.*          rail, top bar (+ <app-site-tools />), tabs, FAB, alerts panel
    dashboard/      tracker-dashboard.*      /tracker/app
    transactions/   tracker-transactions.*   /tracker/app/transactions
    privacy/        tracker-privacy.*        /tracker/app/privacy
    alerts/         tracker-alerts.*         /tracker/app/alerts
    how/            tracker-how.*            /tracker/app/how
    ui/             tracker-drawer, tracker-add (paste + manual), tracker-charts (bars, donut, line), tracker-icon
    settings-panel/ tracker-settings-panel.*
    profile-panel/  tracker-profile-panel.*
    styles/         _tracker-tokens.scss (or shared, Q3 B), _tracker-app.scss
  public/apps/tracker/manifest.webmanifest, icons; public/og/tracker.png
App-WebAPI/Thakurg/
  Thakurg.API/Controllers/Tracker*.cs
  Thakurg.Application/{Services,Repositories}/ITracker*.cs, Common/ICommonDbContext.Tracker.cs
  Thakurg.Infrastructure/{Services,Repositories}/Tracker*.cs, DependencyInjection (AddScoped)
  Thakurg.Domain/Entities/Tracker*.cs
  Thakurg.Contracts/Tracker/*Dto.cs, Configurations/TrackerOptions.cs, Messages/MessageCodes.Tracker.cs
  Thakurg.Tests/ (new)                   parser tests
App-Database/DatabaseInitializer/
  SqlScripts/CREATE/Tracker/001..011, SqlScripts/INSERT/Tracker/001..003
  Seeding/TrackerDatabaseSeeder.cs, SeederRegistration.Tracker.cs
  SqlScripts/INSERT/Common/001_Messages, 004_PageNames, 007_Translations (+ tracker rows)
```

---

## 9. Build phases

| Phase | What you get | Done when |
|---|---|---|
| **0. Groundwork** | Q3 decision applied (shared icons and tokens in `matrix`, or copies); `bare` route; empty shell with rail, top bar (same theme/language menus), tabs; Settings and Profile sections registered | `/tracker/app` opens in every skin and language, 320 px to desktop; builds pass |
| **1. Core** | Tables + seeds; API for transactions, summary and settings; parser + tests; **Paste SMS** and **Add manually**; Dashboard, Activity (filters, search, drawer actions), Privacy, How it works; Settings section (approval, threshold, alerts); Profile part (export, delete SMS texts, delete all); public `/tracker` page with SEO | The 13 sample SMS give the prototype's results; the pre-finish checklist of CLAUDE.md passes |
| **2. Phone** | Installable `/apps/tracker/`, **Share to SnapTracker** (share target); alerts list + push notifications (web push, free) | On an Android phone: share a bank SMS → it appears as a transaction |
| **3. Khata + admin** | `ILedgerPoster` in `matrix`, Khata implementation, auto-post and book choice; super-admin lists of senders and merchants (Q7) | In `banni-linux`, confirming a transaction makes one Khata entry, and ignoring or deleting removes it |
| **4. Android app** (Q1 B) | Kotlin receiver, phone-side filters, queue, device pairing, signed uploads, Play Store declaration | Real SMS on a phone arrive without opening the app |

Each phase ends with:
- `ng build` / `npm run build`, plus the API and database builds;
- a check at 320 px and in Arabic (right-to-left);
- your review.

Nothing is committed or merged without your yes.

---

## 10. Risks and limits (honest list)

- **No automatic SMS reading on the web, ever.** Until phase 4, the user pastes or shares each SMS. The share target needs the installed app on Android; iPhone has no share target for web apps.
- **SMS formats vary by bank and change.** The parser will miss some formats; those land in *Needs verification* rather than being lost. Tests keep known formats working.
- **Google Play** allows SMS permission only for declared uses; expense tracking from bank SMS is an accepted use, but review can take time and needs a privacy policy page (we have `/privacy`, which would get a SnapTracker paragraph).
- **Privacy:** SMS bodies are personal financial data. They are encrypted at rest (same protector as Khata's secrets), never logged, deletable by the user, and OTPs are never stored.
- **Free hosting:** parsing is light; the free Azure SQL allowance is enough for personal use.

---

## 11. Branch and merge notes

- **Branch names don't match.** The local branch is `Features/App/Tracker`, in the folder `thakurg-branches\SnapTracker`. GitHub still has `origin/Features/App/snapTracker`, and `branch-guide.md` / `branch-architecture.md` still say `Features/App/snapTracker` (*"prototype only"*). Decide which name stays. Then, in phase 0, update both documents and set the branch's upstream (this needs your approval: it's a branch change).
- **Merge order:** as always.
  1. Shared pieces (Q3 B icons and tokens, `ILedgerPoster`) go into `matrix` first, then get merged into every feature branch.
  2. Tracker work stays on `Features/App/Tracker`.
  3. `banni-linux` gets Tracker by merge.
  4. `feature-routes.ts` in `banni-linux` lists all apps (`merge=ours`), so its Tracker entries are added by hand there, as was done for Khata.
- **Planner's worktree has an old path.** `git worktree list` shows Planner's worktree as *prunable*, because Git still records it as `thakurg-branches\Tasks`. The folder is now `thakurg-branches\Planner` and works. Running `git worktree repair` once inside the Planner folder updates the record. Don't run `git worktree prune`: it would drop the record of a worktree that is in use.
