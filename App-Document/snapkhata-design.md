# SnapKhata — design and research (`/khata`)

SnapKhata is a digital udhar khata (credit ledger), similar to OkCredit, built into thakurg.com at `/khata`.
This document covers the features, research findings, recommended architecture, data model, API, screens and build phases.

Status: **proposal, local development only.** Everything runs on the developer machine: Angular dev server, the local `Thakurg.API` and SQL Server LocalDB. Hosting is out of scope for now.

---

## 1. Requirements

| # | Requirement | Where covered |
|---|---|---|
| 1 | A ledger app similar to OkCredit | §2, §8 |
| 2 | Add contacts (customers/suppliers) with their details | §6 `KhataContacts`, §8 screen E |
| 3 | Add transactions with an optional photo (bill/receipt) | §6 `KhataTransactions`, §8 screen D |
| 4 | Per contact, an on/off switch that decides whether that person may add transactions | §6 `AllowContactEntries`, §5.5 |
| 5 | Per-contact notifications by app push, SMS and email, **all off by default** | §6 `KhataNotificationPrefs`, §5.7 |
| 6 | Images and a JSON record of the transactions are stored in Google Drive | §5.3, §5.6 |
| 6a | **Each user connects their own Google account** (the one signed in on their device). Ramesh's data goes to Ramesh's Drive and John's to John's Drive | §3.1, §5.3 |
| 6b | Connecting Drive is strongly recommended, but the user may **skip** it. Then files are saved locally in **`App-Data/khata/`** (the existing git-ignored runtime folder) | §3.2, §5.6 |
| 6c | In a shared ledger, **JSON and photos are copied** to the contact's own storage too | §3.1, §5.4 |
| 6d | When a user changes Google account, files are **moved** to the new Drive | §5.8 |
| 7 | Only logged-in users reach `/khata/app`, and each user sees only their own ledger. Login by **mobile OTP, email OTP or Sign in with Google** | §5.1, §5.2 |
| 8 | Research a better way to implement it | §3 |
| 9 | After the first login, the user **creates an app PIN**. Every time the app is opened, it asks for that PIN | §3.7, §5.9 |
| 10 | **Editing or deleting an existing transaction requires the PIN** | §3.7, §5.9 |
| 11 | SnapKhata is an **installable app** (home screen / desktop icon, opens in its own window) | §3.8, §5.10 |
| 12 | A contact must **accept** a shared ledger before they see it or get copies | §3.9, §5.11 |
| 13 | One user can keep **multiple books** (e.g. "Kirana shop", "Home") | §3.10, §5.12 |
| 14 | Each book has a **money type (currency)**, chosen from a list, and users can **add their own** | §3.11 |
| 15 | **Rate limiting** wherever it is needed | §3.12 |
| 16 | Transactions (and all SnapKhata data) are saved in **SQL Server, in the same `thakurg-meta` database, in their own new tables** | §6 |
| 17 | Further suggestions | §3.13 |
| 18 | **Import from OkCredit**: move existing customers, suppliers and transactions from OkCredit into SnapKhata | §3.15 |

---

## 2. What OkCredit does (feature reference)

From OkCredit's public pages and store listing:

- A free digital *bahi khata*: one ledger per customer or supplier, with a running balance ("You will get" / "You will give").
- Each entry is **"You gave"** (credit given) or **"You got"** (payment received), with an amount, note, date and optional bill photo.
- **Shared ledger:** if the customer also uses the app, they see the same ledger. The owner can **block** that customer from adding entries. This is our requirement 4.
- Reminders by SMS and WhatsApp, either manual or automatic on a due date. Reminders contain a UPI payment link.
- 11 Indian languages, GST billing, stock management and loans.

**In scope for the SnapKhata MVP:** the ledger, contacts, entries with photos, per-user Google Drive storage, the shared ledger with the allow/block switch, per-contact notifications, OTP login, and en/hi/ar.
**Later:** due-date reminders, UPI link, PDF statement.
**Out of scope:** GST billing, stock and loans.

---

## 3. Research findings and recommendations (requirement 8)

### 3.1 Each user's own Google Drive (OAuth per user)
- **How it works:** after logging in, the user taps **"Connect Google Drive"**. Google's account chooser shows the Google accounts signed in on that device, and the user picks one (Ramesh picks Ramesh's account, John picks John's). Google asks for consent, and the API stores a **refresh token for that user**. From then on, the API uploads that user's photos and JSON to **their own** Drive, even when they are not online.
- **Scope: `https://www.googleapis.com/auth/drive.file` only.** The app can see and change **only the files it created**, never the rest of the user's Drive. Google classes this as a *non-sensitive, recommended* scope, so Google doesn't require a security review. The consent screen reads like "See, edit, create and delete only the specific Google Drive files you use with this app", which is easy for users to trust.
- **Do it on the server, not in the browser.** The flow is the OAuth **authorization-code flow** with `access_type=offline` and PKCE, handled by the API.
  - **Why not a browser-only token** (Google Identity Services token model): it lasts about 1 hour, needs a popup to renew, and the server couldn't upload when a *contact* adds an entry or when a background JSON sync runs.
  - The refresh token is **encrypted at rest** with ASP.NET Core Data Protection and never sent to the browser.
- **Whose Drive is used in a shared ledger (decision Q2: copy JSON and photos):**
  - Each ledger has one **home**, the **owner's** storage. If Ramesh (a contact) adds an entry with a photo in John's ledger, the API uploads it to **John's** Drive with John's token.
  - A **full copy** (`ledger.json` + photos) is also written to the **contact's own storage** (Ramesh's Drive, or his `App-Data` folder if he skipped Drive), under `SnapKhata/shared/…` (§5.6). Each side therefore keeps its own complete backup.
  - Copies are made only for a contact who has logged in, so their contact row is linked to a SnapKhata user. Copies follow every change: new entries, edits, and soft deletes (marked `"deleted": true`; photos are kept).
  - If the owner removes the contact, syncing stops. The copies already in the contact's storage stay there, because they are the contact's records.
  - The contact settings screen tells the owner: "A copy of this ledger, including photos, is saved to Ramesh's own storage."
  - Viewing in the app always goes through the API (permission-checked) and reads from the home copy, never through a Drive link.
- **If access is revoked** (the user removes the app at myaccount.google.com, or the token expires):
  - Google returns `invalid_grant`. The API marks the connection `NeedsReconnect`, keeps new uploads queued in SQL, and the UI shows a "Reconnect Google Drive" banner.
  - Entries keep working because SQL is the source of truth. Only photos and backups wait.
  - Old photos show a placeholder until the owner reconnects.
- **Things to know for local development:**
  - Create an OAuth client (type *Web application*) in Google Cloud Console and enable the **Google Drive API**. Add the redirect URI `https://localhost:7001/api/khata/google/callback`. Google allows `localhost` redirect URIs.
  - While the consent screen is in **"Testing"** status:
    - only the Google accounts you list as **test users** (up to 100) can connect, and
    - **refresh tokens expire after 7 days**, so expect to reconnect weekly during development.

    Publishing the app (with only `drive.file`) removes both limits.
- **Sign in with Google (decision Q5: yes):** a third login option next to mobile and email OTP. One tap logs the user in **and** connects their Drive in the same consent, with a verified email and no OTP cost (§5.2b).

### 3.2 Google Drive: photos and backup, not the database
- A JSON file on Drive cannot be the main data store. It can't be queried, has no locking (two people adding entries at once would overwrite each other), and is slow.
  **Decision:** **SQL Server (LocalDB) is the source of truth.** The owner's Drive holds:
  - the **photos** (private, never shared publicly), and
  - a **JSON snapshot per contact ledger**, rewritten after each change (debounced), as a readable backup and export. This meets requirement 6.
- Photos are private financial records. They are **never** given "anyone with the link" access. The browser receives them only through `GET /api/khata/attachments/{id}`, which checks that the caller is the ledger owner or its linked contact.
- Drive suits this well: photos are small (compressed to ~200 KB), uploaded rarely and viewed rarely.
- **Skip option, saved locally in `App-Data` (decision Q1):**
  - The connect screen strongly recommends Drive and explains why: "Your bills stay safe in your own Google account even if this server is reset." A **Skip for now** button is also shown.
  - A user who skips gets `StorageProvider = Local`, and their files go to **`App-Data/khata/`**, inside the existing `App-Data` runtime folder at the repo root (the same folder the music players use; SnapKhata keeps to its own `khata` subfolder). It uses the same folder layout as Drive (§5.6).
  - `App-Data` is already **git-ignored** (`/App-Data/` in `.gitignore`), which matters because it holds private bills.
  - While a user is on local storage, a small banner reminds them to connect Drive.
  - When they later connect Drive, their local files are **moved** into the new Drive, using the same migration job as changing Google account (§5.8).
- **One storage interface:** `IFileStore`, with `GoogleDriveFileStore` and `LocalFileStore`. The API picks the implementation from the target user's `StorageProvider`, so the upload, copy, move and JSON code doesn't care where files go.

### 3.3 OTP login: email first; SMS in India needs DLT
- **SMS in India:** TRAI's DLT rules apply to all business SMS, OTP included. Before any SMS is delivered you must register the entity (about ₹5,900), a sender ID and each template. Expect 2–4 weeks the first time. After that, gateways such as MSG91 cost about ₹0.15–0.20 per OTP. *(Vendor figures; check the current rate card.)*
- **Firebase Phone Auth** skips DLT (Google sends the SMS). It costs about $0.01–0.06 per SMS in India (sources disagree) and needs the Blaze plan.
- **Email OTP is free:** Brevo gives 300 emails a day, Resend 3,000 a month.
- **For local development**, both channels go through an `IOtpSender` interface:
  - `DevOtpSender` writes the code to the API console log, so no account or cost is needed.
  - `BrevoEmailSender` / `SmsSender` are switched on by configuration when real sending is wanted.
- **Recommendation:** build email + mobile OTP now with the dev sender. Use real email (Brevo) next, and real SMS (Firebase or MSG91 + DLT) last.

### 3.4 Notifications: web push is free, so use it first
- The site already has the **Angular service worker** (`ngsw-config.json`). **Web Push** (VAPID keys, Angular `SwPush`) is free and works on `localhost`, because browsers treat it as a secure context.
  - The service worker is only active in a production build, so test push with `ng build` + a static server, not `ng serve`.
- **Email** uses Brevo. **SMS** costs money and needs DLT templates, so the toggle is shown but disabled ("coming soon") until a real sender exists.
- India's **DPDP Act 2023**: SMS/email to a *contact* (a third party) needs a lawful basis. Keeping every channel **off by default**, as requested, is correct. Also record who switched each channel on, and when.

### 3.5 Sessions (local)
- UI at `http://localhost:4200`, API at `https://localhost:7001`. Browsers treat these as the **same site** (the port doesn't count), so a refresh-token cookie works: `HttpOnly`, `Secure`, `SameSite=Lax`, path `/api/khata/auth`.
- Access token: JWT, 15 minutes, kept **in memory only**. On page load the UI calls `/api/khata/auth/refresh` to get a new one.
- CORS for the API's `Development` environment already allows `http://localhost:4200`. Add `AllowCredentials()` for the khata endpoints.

### 3.6 Other recommendations
- **Ledger entries are never really deleted (decision Q4: always editable).** The person who added an entry can edit or delete it **at any time**. Every edit creates a new version in `KhataTransactionHistory`, and "delete" is a soft delete. Both sides see "edited" or "deleted" labels and can open the full history. Because there is no time lock, the history is what keeps a shared ledger trustworthy. This follows the repo's `IsSoftDeleted` rule.
- **Money is stored as an integer in the currency's smallest unit** (`BIGINT`, e.g. paise for INR, fils for AED), never as float. See §3.11.
- **Entries added by a contact are labelled** "Added by Ramesh". If the owner turns that contact's switch off, the existing entries stay and only new ones are blocked.
- **Compress photos on the client** before upload: max 1600 px, WebP/JPEG about 0.7 quality, about 200 KB. Strip EXIF (location). Allow 1 photo per entry in the MVP, up to 3 later.
- **Rate limits:** see §3.12 for the full list.
- **Store OTPs only as hashes** (HMAC-SHA256 with a server secret). They expire after 5 minutes and work once.
- **Offline entry** (later): queue new entries in IndexedDB when offline and sync when back online.

### 3.7 App PIN: lock on open, and on edits (requirements 9 and 10)
- **What it is:** a **4–6 digit PIN**, chosen by the user right after their first login, by OTP or Google. It belongs to the user, not the device, so the same PIN works on every device they log in on.
  - Too-easy PINs (`0000`, `1111`, `1234`, `123456`, date-like `1990`…) are rejected.
  - The PIN is typed twice when it is set.
- **The server checks the PIN, not the browser.** It is stored only as a hash (ASP.NET Core `PasswordHasher`, PBKDF2) in `KhataUsers.PinHash`. Each check is a call to the API, so clearing browser storage or editing JavaScript can't bypass it.
- **Two kinds of access token:**
  - The access token from login/refresh carries `pin: false`. With it, the API allows only `/auth/*`, `/auth/pin/*` and the profile name, for the unlock screen. **No ledger data.**
  - `POST /api/khata/auth/pin/unlock` with the correct PIN returns an access token with `pin: true` (15 min, renewed in the background while the app is in use). Every ledger endpoint requires `pin: true`.
- **When the PIN is asked (requirement 9):**
  - **Every app open:** a cold start of the installed app, a new browser tab, or a page reload. The unlocked token lives **in memory only**, so every fresh start begins locked. Tabs that are already open share the unlocked state through `BroadcastChannel`, so the user isn't asked again in each open tab.
  - **After the app has been in the background for 5 minutes** (`visibilitychange`; configurable in `Khata:Pin:LockAfterMinutes`). The UI throws away the token and shows the unlock screen.
  - The "Lock now" button in the header.
- **Editing or deleting an existing transaction (requirement 10)** needs a fresh PIN check, even when the app is already unlocked:
  1. The user taps Edit or Delete, and a PIN sheet opens.
  2. `POST /api/khata/auth/pin/proof { pin, purpose: "EditTransaction" | "DeleteTransaction", targetId }` returns a **PIN proof**. It is valid **2 minutes**, works **once**, and only for that transaction and action.
  3. `PUT` / `DELETE /api/khata/transactions/{id}` must send the header `X-Khata-Pin-Proof`. Without a valid proof the API returns 403 `KhataPinRequired`.
  - Adding a **new** entry needs no extra PIN, only the unlocked app.
- **Other risky actions also need a PIN proof (decision Q6):**
  - changing the PIN,
  - disconnecting Drive or changing the Google account,
  - deleting a contact,
  - deleting a book, and
  - turning a contact's "can add entries" switch **on**. Turning it off needs no PIN, because that only makes things safer.

  Each of these sends `X-Khata-Pin-Proof` with its own purpose.
- **Wrong PIN:**
  - 5 wrong tries → locked for 15 minutes.
  - 10 wrong tries in total → the PIN is cleared and every session of the user is logged out. The user must log in again by OTP or Google and set a new PIN.
  - Every attempt is recorded in `KhataPinAttempts`.
- **Forgot PIN:** the unlock screen has "Forgot PIN?". It sends the user to log in again (OTP or Google), then **set a new PIN**. Resetting the PIN logs out all other devices.
- **Later:** **fingerprint or face unlock** through WebAuthn (passkeys), as a faster alternative to typing the PIN on devices that support it. The PIN stays as the fallback.

### 3.8 Installable app (requirement 11)
- SnapKhata becomes an installable **PWA (Progressive Web App)**. It works on Android (Chrome/Edge), Windows/macOS/Linux (Chrome/Edge) and iPhone/iPad (Safari, "Add to Home Screen"), and it opens in **its own window** without the browser bar. This needs no app store and no separate codebase.
- The site already has a manifest (`public/manifest.webmanifest`, "Internet Speed Test", scope `/`) and the Angular service worker (`ngsw-config.json`). SnapKhata gets **its own, separate manifest**, so it installs as its own app with its own name and icon, next to the Speed Test app:
  - `public/khata/manifest.webmanifest`: `"id": "/khata/app"`, `"start_url": "/khata/app?source=pwa"`, `"scope": "/khata/"`, `"display": "standalone"`, name "SnapKhata", own theme colours, and icons 192/512 plus a maskable 512 in `public/khata/icons/`.
  - `"shortcuts"`: "Add entry" (`/khata/app?action=add`) and "Contacts" (`/khata/app`). Long-pressing the icon shows them.
  - `"screenshots"` (one narrow and one wide), so Chrome shows the richer install dialog.
- **Making `/khata` pages use the SnapKhata manifest:**
  - The prerendered `/khata` and `/khata/login` HTML get `<link rel="manifest" href="/khata/manifest.webmanifest">`, swapped in by `scripts/postbuild.mjs`.
  - The client-rendered `/khata/app/**` pages swap the `<link rel="manifest">` at runtime from the khata shell component. Chrome picks the change up.
- **Install button:**
  - Chrome/Edge/Android: listen for `beforeinstallprompt` and show an **"Install SnapKhata"** button on `/khata`, after login and in Profile.
  - iPhone/iPad: no install prompt exists, so show a short "Tap Share → Add to Home Screen" guide.
  - When the app already runs installed (`display-mode: standalone`), hide the button.
- **Private data stays out of the service worker cache.** `ngsw-config.json` has no `dataGroups` today. Keep it that way for `/api/khata/**`, because cached ledger data would be readable without the PIN. The app shell (HTML/JS/CSS/icons) is cached, so the installed app opens fast and shows the PIN screen even offline. Ledger data loads only after unlock.
- **Local testing:**
  - The service worker and install only work in a **production build**: `npm run build`, then serve `dist/thakurg/browser` on `http://localhost:4200` (e.g. `npx http-server dist/thakurg/browser -p 4200`). `localhost` counts as secure, so install works.
  - Check DevTools → Application → Manifest for installability.
  - Testing on a real phone needs HTTPS, so use Chrome remote debugging with port forwarding to the phone.
- **Later, not in scope now:** publish to the Play Store as a Trusted Web Activity (Bubblewrap). That needs the site hosted on a public domain.

### 3.9 Contact must accept a shared ledger (decision Q8)
- Before Ramesh sees John's ledger, or gets copies in his storage, he must **accept** it. When Ramesh logs in with a verified mobile or email that matches a contact in one of John's books, he sees an invitation:
  > "John Traders (book: Kirana shop) keeps a khata with you. Accept / Decline"
- **Until accepted:**
  - Ramesh can't open the ledger.
  - Ramesh can't add entries, even if John switched "can add entries" on.
  - No notifications go to Ramesh's own account.
  - No files are copied to Ramesh's storage.
  John's own ledger works normally.
- **After accepting:** the shared view and the JSON + photo copies start (§3.1). The first sync copies the full history.
- **Decline:** the invitation disappears. Ramesh can still accept later from "Shared with me → Declined".
- **Leave:** Ramesh can stop sharing at any time. Copies already in his storage stay (they are his records), and new syncing stops.
- **What John sees** on the contact screen: "Not on SnapKhata", "Invited", "Accepted" or "Declined".
- Notifications that John sends to Ramesh's **mobile or email** (§5.7) are a separate setting. They follow John's per-contact switches and don't need the acceptance. All of them are still off by default.
- This consent step also suits India's DPDP Act 2023.

### 3.10 Multiple books per user (decision Q9)
- **A book** (`KhataBooks`) is a separate khata with its own name, currency, contacts, totals and storage folder, e.g. "Kirana shop" (INR), "Home" (INR) and "Dubai trade" (AED).
- **Default book:** on first use, after the PIN and storage steps, the user creates their first book: a name (default "My Khata") and a currency (default INR).
- **Book switcher:** the app header has a book switcher, and the app remembers the last book used. The home screen shows the totals of the **current book** only, with no mixing across books.
- **One person in several books:** the same person can be a contact in several of a user's books, as separate contact rows. Each one is its own shared ledger and its own invitation for that person.
- **Deleting a book** is a soft delete and needs a PIN proof. Its files stay in storage.
- **Storage:** each book has its own folder, `SnapKhata/books/{bookId}_{name}/…` (§5.6).

### 3.11 Money type (currency) per book (decision Q10)
- Each book has **one currency**, chosen when the book is created. Every amount in that book is in that currency, and nothing is converted between books.
- **Built-in list** (`KhataCurrencies`, seeded by an INSERT script):

  | Currency | Symbol | Decimals |
  |---|---|---|
  | INR | ₹ | 2 |
  | AED | د.إ | 2 |
  | SAR | ﷼ | 2 |
  | USD | $ | 2 |
  | EUR | € | 2 |
  | GBP | £ | 2 |
  | KWD | د.ك | 3 |
  | OMR | ﷼ | 3 |
  | BHD | .د.ب | 3 |
  | QAR | ﷼ | 2 |
  | NPR | रु | 2 |
  | PKR | ₨ | 2 |
  | BDT | ৳ | 2 |
- **"+ Add money type":** a user can add their own type with a code (up to 10 characters), a symbol, a name and decimals (0–3). Examples: "Gold (g)" with 3 decimals, "Rice (kg)" with 0, or a currency missing from the list.
  - Custom types belong to **that user** (`OwnerUserId`) and can be used in any of their books.
  - The built-in list has `OwnerUserId = NULL` and is shared by everyone.
- **Storage:**
  - Amounts are saved as whole numbers in the smallest unit: `AmountMinor = amount × 10^Decimals` (₹12.50 → 1250; 1.250 KWD → 1250).
  - The UI formats amounts with the book's symbol and decimals (`Intl.NumberFormat` for real currency codes, symbol + number for custom types).
  - Arabic shows the amount right to left with the symbol in the correct place.
- **A book's currency can't be changed once it has a transaction**, because every stored amount depends on the decimals. Before the first entry, it can still be changed.
- **Shared ledgers** always show amounts in the **owner's book currency**, and the contact sees the same currency.

### 3.12 Rate limiting (requirement 15)
The API already has rate limiting: `AddThakurgRateLimiting` in `Thakurg.Infrastructure/Security/SecurityExtensions.cs`, configured under `RateLimiting` in `appsettings.json`.
- **Global:** 600 requests a minute per IP.
- **`sensitive`:** 10 a minute per IP.
- **`stream`:** 30 a minute per IP.
- When a limit is hit, the API returns 429 with `Retry-After` and the `TooManyRequests` message.

SnapKhata reuses this setup and adds **two layers**:

1. **Request limits** (ASP.NET Core rate-limiter middleware, `[EnableRateLimiting("khata-…")]`) stop floods early, before any database work.
   - Requests without a login are keyed by **IP**.
   - Logged-in requests are keyed by **user ID** (the token's `sub` claim).

   Using the user ID matters for local testing: every local test user comes from the same `::1` address, so a per-IP limit would treat them all as one.
2. **Account limits**, kept in SQL inside the services. They apply per mobile/email or per user, still apply after an API restart, and have their own message codes. Examples: OTPs per identifier, PIN tries, daily upload and notification counts.

**Request-limit policies** (new entries under `RateLimiting:Khata`, all configurable):

| Policy | Endpoints | Key | Limit | Type |
|---|---|---|---|---|
| `khata-otp-send` | `POST auth/otp/send`, `me/verify-second` | IP | 5 per 10 min | sliding window |
| `khata-otp-verify` | `POST auth/otp/verify` | IP | 10 per 10 min | sliding window |
| `khata-google` | `GET auth/google/start`, `google/connect`, `google/callback` | IP | 10 per min | fixed window |
| `khata-refresh` | `POST auth/refresh` | IP | 30 per min | fixed window |
| `khata-pin` | `auth/pin`, `pin/unlock`, `pin/proof`, `pin/change` | user (IP before login) | 10 per min | fixed window |
| `khata-write` | every POST/PUT/DELETE on books, contacts, transactions, currencies, shared, permissions, notifications | user | 60 per min, bursts up to 20 | token bucket |
| `khata-upload` | `POST …/transactions` with photos | user | 20 per min | fixed window |
| `khata-read` | every khata GET | user | 300 per min | token bucket |
| `khata-attachment` | `GET attachments/{id}` (every view costs a Drive call) | user | 120 per min | fixed window |
| `khata-storage` | `storage/skip`, `storage/migration/retry`, `DELETE google` | user | 5 per 10 min | fixed window |
| `khata-push` | `POST/DELETE push-subscriptions` | user | 10 per min | fixed window |
| `khata-reminder` | `POST contacts/{id}/reminders` (P1) | user | 30 per hour | fixed window |
| `khata-export` | `POST exports` (P4) | user | 10 per hour | fixed window |
| `khata-restore` | `POST restore` (P6) | user | 3 per day | fixed window |
| `khata-account` | `POST me/delete`, `POST me/delete/cancel` (P7) | user | 5 per hour | fixed window |
| `khata-import` | `POST imports`, `POST imports/{id}/run`, `POST imports/{id}/undo` (§3.15) | user | 5 per hour | fixed window |

**Account limits** (in the services, stored in SQL, each with its own message code):

| What | Limit | Message code |
|---|---|---|
| OTP send, per mobile/email | 1 every 45 s; 3 per 10 min; 10 per day | `KhataOtpTooSoon` (with seconds left), `KhataOtpDailyLimit` |
| OTP verify, per code | 5 tries, then the code is burned | `KhataOtpInvalid`, `KhataOtpExpired` |
| PIN, per user | 5 wrong → 15 min lock; 10 wrong → logout and new PIN (§3.7) | `KhataPinLocked` (with minutes left) |
| Photo upload, per user | 200 per day; max 3 photos per entry; max 2 MB per photo after compression (request body limit 7 MB) | `KhataUploadDailyLimit`, `KhataFileTooLarge` |
| Size caps, per user | 20 books; 20 custom money types; 5,000 contacts per book | `KhataLimitReached` |
| Notifications to one contact | 20 emails / 60 push per day. Several entries within 10 min are sent as **one** message ("3 new entries") | (logged, not shown) |
| Email sending, whole app | under Brevo's free 300 per day: counted daily, and OTP emails go first, notifications wait | `KhataEmailUnavailable` |
| Google Drive calls (background) | max 3 at once per user. On Drive `403 userRateLimitExceeded` / `429`: exponential backoff (1 s → 2 → 4 … up to 5 min) with random jitter | (retry, no error to user) |

- **Every 429** returns `Retry-After`. The UI shows a countdown ("Try again in 0:42") instead of a generic error.
- **Local development:** `appsettings.Development.json` can raise or lower the numbers. Keep them low while testing the PIN and OTP lockouts, so the limits are easy to trigger.
- Rejected requests are written to `KhataAuditLog` (§3.13) with the policy name, so floods are visible.

### 3.13 Additional recommendations (requirement 17)

**Adopted.** These protect correctness and security, and are part of the design and phases:

| # | Recommendation | Why |
|---|---|---|
| S1 | **Idempotency key on every create:** the UI sends `X-Idempotency-Key` (a new GUID per tap) on `POST` transaction, contact and book requests. The API stores it in `KhataIdempotencyKeys` for 24 h and returns the first result again for a repeat. | A double tap or a weak-network retry never creates a duplicate entry. This matters for money. |
| S2 | **Edit conflict check:** `KhataTransactions` and `KhataContacts` get a `RowVersion` column. Edits send the version they started from, and if someone else changed the row meanwhile, the API returns 409 "This entry was changed by Ramesh — reload". | Two people can edit a shared ledger at the same time. |
| S3 | **Balance in the same SQL transaction:** saving, editing or deleting an entry updates `KhataContacts.BalanceMinor` inside the same SQL transaction. A nightly check recalculates the balances and logs any difference. | The cached balance can never drift from the entries. |
| S4 | **Audit log (`KhataAuditLog`):** logins, PIN set/change/reset, permission and notification switches, share accept/decline/leave, book/contact deletes, Drive connect/disconnect/move, exports and rate-limit rejections. | Shows who did what in a shared ledger, and helps with support and disputes. |
| S5 | **Feature switch in `/master`:** a `khata` row in `003_Features.sql` and `004_PageNames.sql`, so SnapKhata can be turned off like the other pages. Off → `/khata` shows the existing "disabled" page and the API returns 404. | Uses the site's existing settings system. |
| S6 | **Check uploads on the server:** check the file signature (magic bytes: JPEG/PNG/WebP/HEIC only), not just the extension or content type. Enforce the size limits, and remove EXIF/location if the browser didn't. | A renamed `.exe` or a huge file can't get into the user's Drive. |
| S7 | **No private data in logs:** mask mobile numbers and emails (`+91 98•••••210`, `ra•••@gmail.com`). Never log OTPs (except in the console in Development), PINs, tokens or amounts with names. | Logs are often shared when debugging. |
| S8 | **Time zone:** store every timestamp in UTC and `EntryDate` as the user's local date. `KhataUsers.TimeZone` defaults to `Asia/Kolkata`. | "Today" and day totals stay correct for Indian and Gulf users. |
| S9 | **Tests:** unit tests for balance maths (all decimal places), permissions (§5.5), PIN lockout and rate limits. Integration tests against LocalDB for the create/edit/delete + history + idempotency path. | Money logic should be tested before release. |

**Approved features (decisions P1–P9).** All are in scope. Details are in §3.14.

| # | Feature | Decision |
|---|---|---|
| P1 | WhatsApp reminder (free, `wa.me`) | **Yes** |
| P2 | Due date per contact, plus a due/overdue list and reminders to the owner | **Yes** |
| P3 | UPI payment details in reminders | **Yes: UPI ID plus a QR code.** The app generates the QR from the UPI ID, **or** the owner uploads their own shop QR image |
| P4 | Statement export | **Yes: PDF + CSV** |
| P5 | Search, filters and running balance | **Yes** |
| P6 | Restore a book from the `ledger.json` backup | **Yes** |
| P7 | Delete my account | **Yes, with a 7-day grace period** the user can cancel |
| P8 | Daily summary for the owner | **Yes** (off by default) |
| P9 | Import from phone contacts (Contact Picker) | **Yes** |

### 3.14 Approved feature details (P1–P9)

**P1 — WhatsApp reminder**
- A **"Send reminder"** button on a contact's ledger, for contacts with a mobile number.
- It opens `https://wa.me/<mobile without +>?text=<message>`: the WhatsApp app on a phone, or WhatsApp Web/Desktop on a computer. The user taps Send themselves, so there's no API, no cost and no DLT.
- **The message** comes from an i18n template, in the **owner's** language:
  > "Namaste Ramesh, your balance with John Traders (Kirana shop) is ₹1,250 as of 30-10-2026. Last: 28-10-2026 gave ₹1,500 (Rice 25kg). Pay by UPI: john@okhdfc. — sent from SnapKhata"
- **QR code:** WhatsApp doesn't reliably make `upi://` links clickable, so the message shows the **UPI ID as text**. Where the browser supports the **Web Share API with files** (Android Chrome and the installed app), a second button, **"Share with QR"**, shares the QR image and the message together.
- Each send is recorded in `KhataReminders` (who, when, channel), so the ledger shows "Reminder sent 30-10-2026".
- Rate limit: `khata-reminder`, 30 per hour per user.

**P2 — Due date per contact**
- Each contact has an optional **"Collect by"** date (`KhataContacts.DueDate`). It is cleared automatically when the balance reaches 0.
- The contacts screen gets a **"Due today"** filter and an **"Overdue"** filter, each with a count badge.
- On the due date, at 9 AM in the owner's time zone, a background job reminds the **owner** by push/email, if their own notification switches are on. The **contact** is not notified automatically, because that would need their consent. The owner uses P1 for that.

**P3 — UPI ID and QR code (INR books)**
- **Profile → Payment details:** UPI ID (`name@bank`, format checked), payee name, and a QR code from one of two sources:
  - **Generated** from the UPI ID. The API builds `upi://pay?pa=<id>&pn=<name>&cu=INR` and renders a QR PNG with **QRCoder** (MIT licence). For a reminder, the amount is added (`&am=1250.00`).
  - **Uploaded:** the owner's own shop QR image (e.g. a PhonePe/Paytm merchant QR). It passes the upload checks (S6) and is stored in **the owner's own storage** (Drive or `App-Data`), with the reference in SQL.
    - *Optional:* read the uploaded QR with **ZXing.Net** (Apache 2.0) and warn if it doesn't contain a `upi://` address.
- **Where the QR appears:**
  - a **"Pay me"** screen (full-screen QR plus the UPI ID, to show a customer at the counter),
  - the "Share with QR" reminder (P1), and
  - the PDF statement (P4).
- **Which QR is used:** the uploaded QR if there is one, otherwise the generated one. The owner can switch between them.
- **Which books:** only INR books show UPI. Books in other currencies hide it.
- Payments are **not** detected automatically. The owner records "You got" as usual.
- **Changing or removing** the UPI ID or QR needs a **PIN proof** (purpose `ChangePaymentDetails`), so nobody can swap in their own QR on an unlocked phone.

**P4 — Statement export (PDF + CSV)**
- From a contact's ledger, or from a whole book: choose a date range (presets: this month, last month, this year, all) and the format, **PDF** or **CSV**.
- **PDF** (generated by **QuestPDF**; its Community licence is free for small businesses, so check that it fits) contains:
  - the owner's name and book,
  - the contact,
  - the date range,
  - an opening balance,
  - every entry with its running balance,
  - totals for gave and got,
  - the closing balance,
  - the UPI ID + QR for INR books, and
  - "Generated on DD-MM-YYYY by SnapKhata".

  It is in the owner's language, and Arabic is right to left with an Arabic font.
- **CSV:** UTF-8 with BOM, so Excel shows ₹, Hindi and Arabic correctly. Columns: Date, Type, Amount, Note, Added by, Running balance.
- **Delivery:** the file is downloaded, offered through the Web Share API (e.g. to WhatsApp), **and** saved to the owner's storage at `SnapKhata/books/{book}/exports/`.
- Exports are generated in the background (`KhataExports` table, with a status). Small exports are ready in about a second.
- Rate limit: `khata-export`, 10 per hour per user.

**P5 — Search, filters, running balance**
- **Contacts search**, per book: by name, mobile or note.
- **Entry search**, inside a ledger or across the whole book: by note text or an exact amount.
- **Filters:** date range, gave/got, added by (me/contact) and has photo.
- **Running balance:** each entry shows the balance right after it, calculated in SQL with `SUM(...) OVER (PARTITION BY ContactId ORDER BY EntryDate, CreatedOn)`. Soft-deleted entries don't count.
- Indexes: `KhataTransactions(ContactId, EntryDate, CreatedOn)` and `KhataContacts(BookId, Name)`. At this scale a `LIKE` search is enough, so no full-text index is needed.

**P6 — Restore from backup**
- **Profile → Backup → Restore a book:** lists the books found in the user's **own** storage (`SnapKhata/books/*/`, read from `book.json` and the `ledger.json` files).
- **Restore always creates a NEW book**, e.g. "Kirana shop (restored 30-10-2026)", with new IDs. Nothing existing is overwritten.
- **Photos are not copied again:** the new entries point at the existing photo files.
- Contacts are restored with `ShareStatus = NotOnApp`. Sharing starts again with a fresh invitation, because consent is not copied.
- **Safety:**
  - requires a **PIN proof** (purpose `RestoreBook`),
  - the JSON is checked against the expected format, and files over 20 MB or with more than 50,000 entries are refused, and
  - the restore runs as a background job (`KhataRestoreJobs`) with progress.
- Rate limit: `khata-restore`, 3 per day per user.
- Shared copies (`shared/…`) are **not** restored, because they belong to the other person's book.

**P7 — Delete my account (7-day grace period)**
1. **Profile → Delete my account:** the user is shown what will be deleted and which shared ledgers are affected.
2. A **full export** is offered first: all books as PDF + CSV + JSON.
3. The user confirms with a **PIN proof** (purpose `DeleteAccount`) **and** a fresh OTP or Google login within 10 minutes.
4. The user chooses **"Keep my Drive / App-Data files"** or **"Delete them too"**.
5. The account is **scheduled for deletion in 7 days**. All sessions are logged out except the current one. Logging in during the 7 days shows a banner "Your account will be deleted on DD-MM-YYYY", with a **Cancel deletion** button.
6. **On day 7**, a background job:
   - **permanently deletes** the user's rows (books, contacts, entries, history, files, sessions, OTPs and PIN), and the Drive files too if the user chose that;
   - revokes the Google token;
   - in **other people's** books where this user was a contact, clears `LinkedUserId` and sets `ShareStatus = Left`. Those rows belong to the other owner and stay; and
   - leaves an audit entry with an anonymised ID only.
- **Contacts keep their own copies** (`shared/…` in their storage).
- Rate limit: covered by the PIN and OTP limits.

**P8 — Daily summary (owner)**
- **Profile:** "Daily summary" switch (**off by default**), a time (default **21:00**, in the user's time zone) and channels (push / email).
- A background job runs every minute and sends to users whose time has come. Each user gets at most one summary a day, tracked by `LastDailySummaryOn`.
- **Contents,** per book with any activity that day:
  > "Kirana shop: gave ₹4,200, got ₹3,100, 2 due today, 1 overdue."

  If nothing happened that day, nothing is sent.

**P9 — Import from phone contacts**
- An **"Import from phone"** button on Add contact, shown only where the Contact Picker API exists (`'contacts' in navigator`: Android Chrome and the installed app on Android). iPhone and desktop show only manual entry.
- `navigator.contacts.select(['name','tel','email'], { multiple: true })` reads **only the people the user picks**.
- **Phone numbers** are normalised to E.164 with **libphonenumber-js**. The country defaults to the user's mobile country (+91).
- **Before saving**, a review list shows each picked contact with a checkbox. Anyone already in the book with the same mobile is marked "Already in book — skip".
- Limits: 100 contacts per import, plus the `khata-write` rate limit and the 5,000-contacts-per-book cap.

### 3.15 Import from OkCredit (requirement 18)

**What OkCredit allows (research):**
- OkCredit has **no public API**.
- Its web app (`web.okcredit.in`, login by mobile + OTP) offers **"1-click reports"**: a **customer statement** or the **full report** can be downloaded as **PDF or Excel**.
- **Photos (bill images) are not part of these exports**, so they can't be migrated automatically.
- Scraping the OkCredit app or website, or calling its private API, is **not** done. It would break their terms, and it breaks whenever they change something. The import works only from **files the user downloads themselves**.

**Approach: a file import wizard, Excel first and PDF as a fallback.**
1. **The user downloads** from OkCredit web: the **full report as Excel** (best), or one **customer statement per customer** (Excel or PDF).
   - In-app help shows the steps with screenshots: web.okcredit.in → Reports → Download → Excel.
2. **Upload** (`/khata/app/import/okcredit`): one or more `.xlsx` / `.xls` / `.csv` / `.pdf` files, up to 10 MB each and 20 files per import.
3. **Read the file:**
   - **Excel/CSV** is read with **ExcelDataReader** (MIT licence).
   - **PDF** text is read with **PdfPig** (Apache 2.0). This only works for text PDFs, which OkCredit generates; scanned images are not supported.
   - The importer finds the header row by matching known column names in English and Hindi: *Date, Customer/Name, Mobile/Phone, Credit / You gave / Udhar, Payment / You got / Jama, Amount, Balance, Note/Description*.
   - When a statement file is for one customer, the customer name and mobile are taken from its title block.
4. **Column mapping screen:**
   - The detected mapping is shown and can be corrected with dropdowns: "This column is → Date / Name / Mobile / Gave / Got / Amount + Type / Note / Ignore".
   - The date format can be chosen (DD-MM-YYYY by default), with a live preview of the first 20 rows.
   - **The mapping is saved** (`KhataImportProfiles`), so the next OkCredit file imports with one tap. The same wizard also works for Khatabook or any other Excel/CSV.
5. **Choose a target:**
   - **a new book** (recommended; default name "Imported from OkCredit DD-MM-YYYY", money type INR), or
   - an existing book. Matching contacts are joined by **mobile number** first, then by exact name.
6. **Dry run, then a summary before anything is saved:**
   > "42 customers, 6 suppliers, 1,318 entries, from 03-02-2023 to 29-10-2026.
   > Balance check: 46 of 48 customers match OkCredit's closing balance.
   > ⚠ 2 differ (see list) · 3 rows skipped (unreadable date)."

   - The **balance check** compares SnapKhata's calculated balance with the **Balance column** of the file, where there is one. Any mismatch is listed per customer, so nothing is silently wrong.
   - Rows can be fixed or excluded on this screen.
7. **Import:**
   - a background job (`KhataImportJobs`) with a progress bar;
   - one SQL transaction per contact, so a failure never leaves a half-imported ledger;
   - balances are calculated as in S3; and
   - each imported entry is labelled **"Imported from OkCredit"** (`KhataTransactions.Source = 2`, plus the original row number).
8. **Afterwards:**
   - the original files are saved to the user's storage at `SnapKhata/books/{book}/imports/okcredit/` as a record;
   - `ledger.json` is written per contact; and
   - a report is shown: imported counts, skipped rows and balance differences.

**Opening-balance mode (when only a customer list with balances is available):**
- If the file has only **name + mobile + current balance** (no entry history), the importer creates each contact with **one entry**, "Opening balance from OkCredit as of DD-MM-YYYY": gave or got, for that amount.
- This is quick if the old history isn't needed. The history can still be added later from per-customer statements.

**Protection against double imports:**
- Every row gets a fingerprint: `SHA-256(contact mobile/name | date | type | amount | note)`.
- Importing the same file, or an overlapping file, again **skips rows that are already imported** and says so ("1,318 already imported, 12 new").
- The file's own hash is stored too. Uploading the exact same file again shows "Already imported on DD-MM-YYYY" with an option to view that import.

**What is not migrated, and the user is told before importing:**
- bill **photos**;
- OkCredit's shared/linked status with customers (customers get a fresh SnapKhata invitation if they use SnapKhata);
- reminders and due dates (due dates can be set again, P2); and
- OkCredit's GST, stock and loan data.

**Undo:** for **7 days** after an import, "Undo this import" removes exactly the rows created by that job. It needs a PIN proof (purpose `UndoImport`). Entries added by hand afterwards are kept.

**Limits:**
- Rate limit `khata-import`: 5 imports per hour per user.
- Account limits: 50,000 rows per import; the 5,000-contacts-per-book cap applies.
- Uploads pass the S6 checks (real `.xlsx`/`.xls`/`.pdf` file signature, size limit). Excel formulas are read as **values only**, never executed.

**Before building the importer:** a **real OkCredit export** is needed, both a full report in Excel and one customer statement in PDF, with names and numbers blurred if you prefer. That lets the parser be written for OkCredit's exact columns instead of guessing. Until then, the column-mapping step (4) makes the importer work with any layout.

---

## 4. Architecture (local)

```
 Browser  http://localhost:4200  (Angular, ng serve)
   │   /khata                 public landing
   │   /khata/login           mobile OTP | email OTP | Sign in with Google
   │   /khata/set-pin         create app PIN (first login, after Forgot PIN)
   │   /khata/unlock          enter PIN on every app open / after 5 min in background
   │   /khata/connect-drive   connect own Google account, or Skip → local (first time + reconnect)
   │   installable PWA: own manifest /khata/manifest.webmanifest (scope /khata/), Angular service worker
   │   /khata/app/...         private ledger (auth guard)
   │
   │  HTTPS + Bearer access token, refresh cookie
   ▼
 Thakurg.API  https://localhost:7001   (dotnet run, Development)
   │  KhataAuthController / KhataGoogleController / KhataController
   │  Controller → Service → Repository (CLAUDE.md §9)
   ├──► SQL Server LocalDB  (localdb)\MSSQLLocalDB, thakurg-meta   source of truth
   ├──► IFileStore per user
   │      ├─ GoogleDriveFileStore  Google OAuth + Drive API: Ramesh → Ramesh's Drive, John → John's Drive
   │      └─ LocalFileStore        App-Data/khata/ (repo root, git-ignored) for users who skipped
   ├──► Google Sign-In (OpenID Connect)   login + Drive consent in one step
   ├──► IOtpSender            DevOtpSender (console) │ Brevo │ SMS (later)
   └──► Web Push (VAPID)      app notifications
```

The existing `run-all-apis.ps1` / `run-bro.bat` start the API and UI. The `DatabaseInitializer` project runs the new CREATE/INSERT scripts.

---

## 5. Flows

### 5.1 Routes (Angular)

| URL | Page | Access |
|---|---|---|
| `/khata` | SnapKhata landing: what it is, features, FAQ, "Login" button. Redirects to `/khata/app` if already logged in | Public, prerendered, in sitemap (CLAUDE.md §8) |
| `/khata/login` | Continue with Google, or choose email or mobile → enter OTP | Public, `noindex` |
| `/khata/set-pin` | Create the app PIN (enter twice) | Logged in, no PIN yet, `noindex` |
| `/khata/unlock` | Enter PIN to open the app; "Forgot PIN?" | Logged in + PIN set, `noindex` |
| `/khata/connect-drive` | "Connect your Google Drive" step (strongly recommended) with **Skip for now**. Also used to reconnect | Logged in + unlocked, `noindex` |
| `/khata/app` | Opens the last used book (or `/khata/app/books/new` if the user has none) | Logged in + storage chosen |
| `/khata/app/books` | All my books: name, currency, totals; add / rename / delete | Logged in + storage chosen |
| `/khata/app/books/new` | Create a book: name + money type (with "+ Add money type") | Logged in + storage chosen |
| `/khata/app/b/:bookId` | Contacts of this book, with "You will get" / "You will give" totals in the book's currency | Logged in + storage chosen |
| `/khata/app/b/:bookId/contact/:id` | One contact's ledger: entries, balance, add entry | Logged in + storage chosen |
| `/khata/app/b/:bookId/contact/:id/settings` | Contact details, share status, allow-entries switch, notification switches | Owner only |
| `/khata/app/shared` | Invitations (Accept/Decline) and accepted ledgers that **other** people keep with me | Logged in |
| `/khata/app/shared/:contactId` | One accepted shared ledger (read, plus add/edit if allowed) | Logged in + accepted |
| `/khata/app/profile` | My profile, linked email/mobile, Google account (change/disconnect), my notifications, sessions, logout | Logged in |

- **Guards:**
  - `khataAuthGuard`: no session → `/khata/login?next=…`.
  - `khataPinGuard`: no PIN set → `/khata/set-pin`. PIN set but the app is locked (no `pin: true` token in memory) → `/khata/unlock?next=…`.
  - `khataStorageGuard`: the user has neither connected Drive nor skipped (`StorageProvider = None`), or the connection is `NeedsReconnect` → `/khata/connect-drive?next=…`. Skipping sets `StorageProvider = Local`, and the guard then lets the user through. A reconnect can also be skipped, in which case the user's files keep waiting in the queue and the banner stays.

  `/khata/app/shared` works without storage, because the home copy of a shared ledger lives in the owner's storage.
- **Order after a login:** login (OTP or Google) → **set PIN** (first time only) → connect Drive or Skip (first time only) → **create first book** (first time only) → `/khata/app`.
- **Order on every later app open:** refresh session → **unlock with PIN** → `/khata/app`.
- **Own data only:** the **API**, not the URL, enforces that each user reaches only their own pages. Every query filters by the user ID in the token, and someone else's Id is never returned (ids are plain INT, so the check is what protects them — `App-Document/sql-int-id.md`). Someone else's ID returns 404.

### 5.2 Login flow (OTP)

```
1. POST /api/khata/auth/otp/send     { channel: "email"|"sms", identifier }
      → always 200 "If this is valid, a code was sent" (no account enumeration)
      → creates KhataOtps row (hash, expiry 5 min, attempts 0); DevOtpSender logs the code locally
2. POST /api/khata/auth/otp/verify   { identifier, code, deviceId }
      → match: find or create KhataUsers row, mark email/mobile verified
      → returns accessToken (JWT, 15 min, pin: false); sets refresh cookie (30 days, sliding)
      → response includes hasPin: true|false and googleDrive: "connected" | "missing" | "needsReconnect"
      → UI: no PIN → /khata/set-pin; PIN set → /khata/unlock
3. POST /api/khata/auth/refresh      → rotate refresh token, new access token
4. POST /api/khata/auth/logout       → revoke this device's session
```

- A user can link **both** an email and a mobile number to one account. They log in with one and verify the other from Profile.

### 5.2b Sign in with Google (decision Q5)

```
1. UI [Continue with Google] → GET /api/khata/auth/google/start?next=…
      → API creates KhataOAuthStates row (Purpose = Login, no UserId yet, PKCE verifier) → 302 to Google
      scopes: openid email profile https://www.googleapis.com/auth/drive.file
2. Google account chooser (accounts on this device) → consent
3. GET /api/khata/google/callback?code&state   (one callback for Login and ConnectDrive purposes)
      → exchange code; read id_token: sub, email, email_verified, name
      → find user: by KhataUsers.GoogleSubject → else by verified Email → else create a new user
      → if drive.file was granted: save KhataGoogleConnections (storage = GoogleDrive, create SnapKhata folder)
         else: user goes to /khata/connect-drive (Connect or Skip)
      → create session, set refresh cookie → 302 to http://localhost:4200/khata/app (or next)
4. UI loads, calls /api/khata/auth/refresh → gets access token (pin: false) → set-pin or unlock (§5.9)
```

- **Account linking:** if the Google email is verified and equals an existing user's verified email (e.g. someone who registered by email OTP), it is the same user. Their `GoogleSubject` is saved and nothing is duplicated.
- **Login Google account and Drive Google account can differ.** `KhataUsers.GoogleSubject` is *who can log in*, and `KhataGoogleConnections` is *where files go*. "Change Drive account" in Profile changes only the storage. A user who signed up with OTP can add Google sign-in later from Profile.
- Login cannot pass `login_hint`, because the user is not known yet. `prompt=select_account` makes Google always show the account chooser, so on a shared device each person picks their own account.
- **Linking contacts to users:** when a user logs in with mobile `9876…` (or an email), every `KhataContacts` row with that verified identifier gets `LinkedUserId` set and `ShareStatus = Invited`. It then appears as an **invitation** under Shared with me, and the person must accept it first (§3.9, §5.11).

### 5.3 Connect Google Drive flow (per user)

```
 UI /khata/connect-drive          API                                   Google
 ─────────────────────────        ───                                   ──────
 [Connect Google Drive] ───GET /api/khata/google/connect──►
                                  create state + PKCE verifier (KhataOAuthStates, 10 min)
                          ◄─── { authUrl } ────
 window.location = authUrl ─────────────────────────────────────────────► account chooser
                                                                         (accounts signed in on
                                                                          this device; user picks
                                                                          own account) → consent
                                  ◄──── GET /api/khata/google/callback?code&state ────
                                  check state, exchange code (+ verifier) for tokens
                                  read Google profile (sub, email) from the id_token
                                  encrypt + save refresh token in KhataGoogleConnections
                                  create Drive folder "SnapKhata" in THIS user's Drive
                          ◄─── 302 to http://localhost:4200/khata/connect-drive?result=ok&next=…
 show "Connected as ramesh@gmail.com" → continue to next
```

Auth URL parameters: `client_id`, `redirect_uri`, `response_type=code`, `scope=openid email https://www.googleapis.com/auth/drive.file`, `access_type=offline`, `prompt=consent select_account`, `include_granted_scopes=true`, `code_challenge` (S256), `state`, and `login_hint=<user's email>` when known.

- **`state` ties the callback to the SnapKhata user.** It is a random value stored with the `UserId`, so the callback needs no cookie or JWT. It is single use and expires after 10 minutes.
- If the user unticks the Drive permission on the consent screen, the callback sees that the `drive.file` scope is missing and shows "Drive permission is needed to save bill photos" with a retry button.
- **One SnapKhata user ↔ one storage at a time.** "Change Google account" in Profile runs the same flow, and then **moves** every file to the new Drive (§5.8).
- **Skip** (`POST /api/khata/storage/skip`) sets `StorageProvider = Local`. Files go to `App-Data` until the user connects Drive, and then they are moved (§5.8).
- **Disconnect:** `DELETE /api/khata/google` first asks "Move your files to this computer (App-Data)?". It moves them with the same job, then revokes the token at `https://oauth2.googleapis.com/revoke` and sets `StorageProvider = Local`.

### 5.4 Add an entry with a photo

```
1. UI compresses the photo → POST /api/khata/contacts/{id}/transactions (multipart)
2. API checks: caller is owner, or a linked contact with AllowContactEntries = 1
3. Save KhataTransactions + KhataAttachments in SQL, holding the photo bytes in App-Data/khata/_temp
   Create KhataStoredFiles rows (SyncStatus = Pending):
     - Role = Home   → owner's storage
     - Role = Copy   → linked contact's storage (only if ShareStatus = Accepted and the contact has chosen storage)
   → 201 at once
4. Background worker (Channel<T> + BackgroundService), for each KhataStoredFiles row:
     IFileStore for that user (GoogleDrive or Local)
     → upload photo → save FileId, set Synced → rewrite that side's ledger.json
     when every row is Synced → delete the temp file
     on failure: retry with backoff; invalid_grant → that user's connection = NeedsReconnect (others still sync)
5. Notifications are queued (§5.7)

Edits and soft deletes of an entry rewrite ledger.json on BOTH sides. A changed photo is uploaded as a new file; the old one is kept for history.
```

### 5.5 Who may add entries (requirement 4)

| Action | Owner | Contact (allow **on**) | Contact (allow **off**) |
|---|---|---|---|
| View ledger | ✅ | ✅ | ✅ |
| Add entry | ✅ | ✅ (labelled "added by contact") | ❌ 403 |
| Edit or delete own entry, **any time** (every version kept in history; **PIN required each time**, §5.9) | ✅ | ✅ | ❌ |
| Edit or delete the other side's entry | ❌ | ❌ | ❌ |
| Change allow switch and notifications | ✅ | ❌ | ❌ |

`AllowContactEntries` is **off by default**. The owner switches it on per contact.

### 5.6 Storage layout, the same in Drive and in `App-Data` (requirement 6)

```
John's Google Drive  (owner of the ledger with Ramesh)
  SnapKhata/
    books/{bookId}_{Kirana shop}/
      book.json                                 name, money type, created on
      contacts/{contactId}_{Ramesh Kirana}/     ← HOME copy
        ledger.json
        photos/{transactionId}_{n}.webp
    books/{bookId}_{Home}/
      …

Ramesh's Google Drive  (contact in John's ledger; copies only after he ACCEPTS)
  SnapKhata/
    books/…                                     ← Ramesh's own books
    shared/{contactId}_{John Traders - Kirana shop}/   ← COPY of John's ledger with Ramesh
      ledger.json
      photos/…

App-Data/khata/  (repo root, git-ignored; for users who skipped Drive)
  _temp/                                        upload buffer, cleared after sync
  users/{userId}/SnapKhata/
    books/…   shared/…                          same layout as in Drive
```

- Drive folder IDs are stored in SQL (`KhataGoogleConnections.RootFolderId`, `KhataStoredFiles.FolderId`). If a user deletes the folder, the next upload gets 404 and the API recreates it.
- `LocalFileStore` only writes inside the configured `App-Data` root. Paths are built from numeric Ids, and names are cleaned, so path traversal isn't possible.
- `ledger.json` example:

```json
{
  "owner": { "name": "John Traders", "googleEmail": "john@gmail.com" },
  "book": { "id": "b12…", "name": "Kirana shop", "currency": { "code": "INR", "symbol": "₹", "decimals": 2 } },
  "contact": { "id": "c7f…", "name": "Ramesh Kirana", "mobile": "+9198…", "email": null },
  "balanceMinor": 125000,
  "balance": "1250.00",
  "generatedOn": "2026-10-30T10:15:00Z",
  "transactions": [
    { "id": "t1…", "type": "gave", "amountMinor": 150000, "amount": "1500.00", "note": "Rice 25kg", "on": "2026-10-28", "addedBy": "owner", "photos": ["t1…_1.webp"], "version": 1, "deleted": false },
    { "id": "t2…", "type": "got",  "amountMinor": 25000,  "amount": "250.00",  "note": "UPI",       "on": "2026-10-29", "addedBy": "contact", "photos": [], "version": 2, "deleted": false }
  ]
}
```

### 5.7 Notifications (requirement 5)
- Two levels of preferences, all **off by default**:
  1. **Per contact** (set by the owner): notify *this contact* when an entry is added or changed, by push, SMS or email.
  2. **Per user, about their own ledgers:** notify *me* when a contact adds an entry, by push or email.
- A channel can only be switched on if it is available: push needs a registered push subscription, SMS needs a verified mobile and a real SMS sender, and email needs a verified email. Otherwise the switch is disabled with a hint.
- Sending goes through `INotificationDispatcher` with one sender per channel (`WebPushSender`, `EmailSender`, `SmsSender`), queued in the background, and every send is written to `KhataNotificationLog`. Locally, the dev senders write to the console.

### 5.8 Move files to another storage (decision Q3: move)
This job runs in three cases:
- the user changes Google account (old Drive → new Drive),
- a user who skipped connects Drive (`App-Data` → Drive), or
- the user disconnects Drive (Drive → `App-Data`).

```
1. Connect the new storage first (the old Google connection stays active during the move)
2. Create KhataStorageMigrations row (FromConnectionId/Local → ToConnectionId/Local, Status = Running)
3. For every KhataStoredFiles row of this user (home and shared copies):
     download from old → upload to new → verify (size + MD5; Drive returns md5Checksum)
     → update FileId/FolderId/ConnectionId in SQL → mark row Moved
4. Rewrite every ledger.json in the new storage
5. Only when ALL files are verified: delete the files and the SnapKhata folder from the old storage
6. Revoke the old Google token; Status = Completed
```

- **Safe on failure:** nothing is deleted until every file is copied and verified. If the job stops halfway, it resumes from the rows not yet `Moved`. Profile shows "Moving files… 120 / 300".
- **If the old Google account was already revoked** (so files can't be read or deleted), the files that can't be moved are listed as "Left in old Drive", and the user is told to reconnect the old account once to finish the move.
- `drive.file` lets the app delete only the files it created, so the user's other Drive files are never touched.
- New uploads during a move go straight to the new storage.

### 5.9 App PIN flows (requirements 9 and 10)

```
SET PIN (first login, or after Forgot PIN)
  /khata/set-pin → enter PIN twice
  POST /api/khata/auth/pin { pin }              allowed only within 10 min of a fresh login
     → reject weak PIN → save PinHash, PinSetOn → returns access token pin: true → continue

OPEN APP (every cold start, new tab, reload)
  POST /api/khata/auth/refresh                  → access token pin: false
  /khata/unlock → POST /api/khata/auth/pin/unlock { pin }
     ok    → access token pin: true (kept in memory, shared with open tabs via BroadcastChannel)
     wrong → 401 + attemptsLeft; 5 wrong → locked 15 min; 10 → PIN cleared, all sessions logged out

BACKGROUND > 5 MIN  (visibilitychange)
  UI drops the pin: true token → /khata/unlock on return

EDIT / DELETE EXISTING TRANSACTION
  tap Edit/Delete → PIN sheet
  POST /api/khata/auth/pin/proof { pin, purpose: "EditTransaction", targetId: "<txn id>" }
     → { proof, expiresIn: 120 }                single use, bound to user + purpose + transaction
  PUT /api/khata/transactions/{id}  header X-Khata-Pin-Proof: <proof>
     → API checks proof (exists, not used, not expired, same user/purpose/id) → marks used → saves new version
     → no or invalid proof → 403 KhataPinRequired

FORGOT PIN
  /khata/unlock → "Forgot PIN?" → /khata/login → OTP or Google → /khata/set-pin
  → new PIN saved, all OTHER sessions revoked
```

- A contact who is allowed to add entries has **their own** PIN for their own account. They also need a PIN proof to edit or delete the entries they added.
- Every PIN check, including a proof, counts towards the same wrong-try limit.

### 5.10 Install flow (requirement 11)

```
/khata (landing) or /khata/app
  Chrome/Edge/Android: beforeinstallprompt fired → keep the event → show [ Install SnapKhata ]
     tap → event.prompt() → user accepts → appinstalled → hide button
  iPhone/iPad Safari: show "Share ⬆ → Add to Home Screen" guide (once, dismissable)
  Already installed (matchMedia('(display-mode: standalone)')) → no button

Installed app icon "SnapKhata" → opens /khata/app?source=pwa in its own window
  → service worker serves the cached app shell → refresh session → /khata/unlock (PIN)
```

### 5.11 Shared-ledger invitation flow (decision Q8)

```
John adds contact "Ramesh Kirana" (+9198…) in book "Kirana shop"   → ShareStatus = NotOnApp
Ramesh logs in with +9198… (verified)                               → LinkedUserId set, ShareStatus = Invited
Ramesh /khata/app/shared → "John Traders · Kirana shop keeps a khata with you"  [Accept] [Decline]
   Accept  → POST /api/khata/shared/{contactId}/accept   → Accepted: shared view on, copies start (full history)
   Decline → POST /api/khata/shared/{contactId}/decline  → Declined: hidden, can accept later
   Leave   → POST /api/khata/shared/{contactId}/leave    → Left: syncing stops, existing copies stay
John's contact screen shows the status; "can add entries" works for Ramesh only when Accepted
```

### 5.12 Books and money type flow (decisions Q9, Q10)

```
First use: /khata/app/books/new
   Name [ My Khata ]   Money type [ ₹ INR ▾ ]  (+ Add money type)
   POST /api/khata/books { name, currencyId }        → becomes current book
Header book switcher → choose book → /khata/app/b/:bookId   (last used book remembered in KhataUsers.LastBookId)
+ Add money type → POST /api/khata/currencies { code, symbol, name, decimals }   (custom, owned by the user)
Change a book's money type → PUT /api/khata/books/{id}  → 409 KhataBookCurrencyLocked if the book has entries
Delete book → PIN sheet → DELETE /api/khata/books/{id} + X-Khata-Pin-Proof → soft delete
```

---

## 6. Data model (SQL Server, same database, new tables; requirement 16)

**Where the data lives:**
- SnapKhata uses the **same SQL Server database the site already uses**: `thakurg-meta` on `(localdb)\MSSQLLocalDB`, through the existing `ConnectionStrings:MSSQLServer`. There is no new database and no new connection string.
- All SnapKhata data goes in **new tables with the `Khata` prefix** (schema `dbo`), next to the existing `Messages`, `AppSettings`, `Features`, `MusicTracks` and `Translations` tables.
- **Transactions are saved in SQL Server first**, in `KhataTransactions`. The save returns only after the SQL commit. Google Drive / `App-Data` receive only the photos and the `ledger.json` backup, afterwards and in the background. If Drive is down, nothing is lost.
- **EF Core:** the new entities are added to the existing `DbContext`. Repositories only, per CLAUDE.md §9. Each change is one SQL transaction: entry + history + balance + stored-file rows + idempotency key + audit row together.

Every table also has the standard columns from CLAUDE.md §9: `IsActive`, `IsSoftDeleted`, `IsDeleted`, `CreatedBy`, `CreatedOn`, `ModifiedBy`, `ModifiedOn`. CREATE scripts use the aligned grid (`sql-table-format.md`) and run through `DatabaseInitializer`.

**Script files** continue the existing numbering in `App-Database/DatabaseInitializer/SqlScripts/CREATE/Common/` (after `009_Translations.sql`), in dependency order:

```
010_KhataUsers.sql                020_KhataNotificationPrefs.sql
011_KhataCurrencies.sql           021_KhataTransactions.sql
012_KhataBooks.sql *              022_KhataTransactionHistory.sql
013_KhataGoogleConnections.sql    023_KhataAttachments.sql
014_KhataOAuthStates.sql          024_KhataStoredFiles.sql
015_KhataSessions.sql             025_KhataStorageMigrations.sql
016_KhataOtps.sql                 026_KhataPushSubscriptions.sql
017_KhataPinProofs.sql            027_KhataNotificationLog.sql
018_KhataPinAttempts.sql          028_KhataIdempotencyKeys.sql
019_KhataContacts.sql             029_KhataAuditLog.sql

* 012 also adds the FK KhataUsers.LastBookId → KhataBooks (the two tables point at each other).
```

**As built (step 1, 30-10-2026),** where the scripts differ in detail from the tables below:
- **Standard columns:** `CreatedBy` / `ModifiedBy` stay `INT NULL` as in every other table, so the shared `BaseEntity` and `WhereActive()` work unchanged. They are left empty. Who did what is in the specific columns (`AddedByUserId`, `ChangedByUserId`, `ConsentChangedByUserId`…) and in `KhataAuditLog`.
- **`KhataTransactions`:**
  - also has **`BookId`**, for book-wide search (P5) and for the per-book unique `ImportFingerprint`;
  - has CHECK constraints `AmountMinor > 0` and `EntryType IN (1, 2)`; and
  - `ImportJobId` gets its foreign key when `KhataImportJobs` is created (phase 1b).
- **`KhataTransactionHistory`:** has `ChangeType` (1 created, 2 edited, 3 deleted). `ChangedOn` is the standard `CreatedOn`. The same goes for `KhataPinAttempts.AttemptedOn`.
- **`KhataStoredFiles`:** has `BookId` and `FileKind` (1 photo, 2 ledger.json, 3 book.json, 4 export, 5 import original, 6 UPI QR) and `LastError`.
- **`KhataPushSubscriptions`:** has `EndpointHash`, which holds the unique index because endpoints are long.
- **Ordering columns** are named `SortOrder` (repo convention), not `Sort`.
- **`KhataUsers`** already has all later-phase columns (UPI, daily summary, deletion), so no ALTER scripts are needed later.
- **Ids:** every primary key is `INT IDENTITY(1,1)` and every foreign key is `INT` (`App-Document/sql-int-id.md`). The only GUID is `KhataIdempotencyKeys.IdempotencyKey`, because it is a random value from the browser, not an Id.
- **Fresh database:** no ALTER or migration scripts until production (`App-Document/sql-fresh-database.md`). Foreign keys are declared inside `CREATE TABLE`. ALTER is used only for the two circular ones, inside the block of the table created second: `KhataUsers.LastBookId` in 012, and `KhataUsers.UpiQrStoredFileId` in 024. The new seed rows are part of the existing `VALUES` lists.
- **`KhataAuditLog`** has no foreign keys on purpose, so audit rows outlive deleted users, books and contacts (P7).

**Seed (INSERT) scripts:**
- `INSERT/Common/011_KhataCurrencies.sql`: the built-in money types.
- New rows in the existing `001_Messages.sql` (all `Khata*` message codes in en/hi/ar), `003_Features.sql` and `004_PageNames.sql` (feature switch S5), and `009_Translations.sql` (the `khata` page row).
- The other Khata tables hold user data only, so they need no seed script.

**KhataUsers**
| Column | Type | Notes |
|---|---|---|
| Id | INT IDENTITY PK | |
| DisplayName | NVARCHAR(100) | |
| Mobile | VARCHAR(15) NULL UNIQUE | E.164, e.g. `+919876543210` |
| MobileVerifiedOn | DATETIME2 NULL | |
| Email | NVARCHAR(256) NULL UNIQUE | lower-cased |
| EmailVerifiedOn | DATETIME2 NULL | |
| BusinessName | NVARCHAR(150) NULL | |
| Language | VARCHAR(5) | `en` / `hi` / `ar` |
| TimeZone | VARCHAR(50) DEFAULT 'Asia/Kolkata' | S8 |
| GoogleSubject | VARCHAR(64) NULL UNIQUE | Sign in with Google identity (Q5) |
| StorageProvider | TINYINT DEFAULT 0 | 0 not chosen, 1 Local (`App-Data`), 2 GoogleDrive (Q1) |
| StorageSkippedOn | DATETIME2 NULL | when the user chose Skip |
| PinHash | NVARCHAR(200) NULL | `PasswordHasher` (PBKDF2) hash of the app PIN; empty = must set PIN |
| PinSetOn | DATETIME2 NULL | |
| PinFailedCount | INT DEFAULT 0 | wrong tries since the last success |
| PinLockedUntil | DATETIME2 NULL | set after 5 wrong tries |
| LastBookId | INT NULL FK → KhataBooks | book opened by default |
| UpiId | VARCHAR(100) NULL | P3, e.g. `john@okhdfc` |
| UpiPayeeName | NVARCHAR(100) NULL | P3 |
| UpiQrSource | TINYINT DEFAULT 0 | P3: 0 none, 1 generated, 2 uploaded |
| UpiQrStoredFileId | INT NULL FK → KhataStoredFiles | P3, the uploaded QR image |
| DailySummaryEnabled | BIT DEFAULT 0 | P8 |
| DailySummaryTime | TIME DEFAULT '21:00' | P8, the user's local time |
| DailySummaryPush / DailySummaryEmail | BIT DEFAULT 0 | P8 |
| LastDailySummaryOn | DATE NULL | P8, at most one a day |
| DeletionScheduledOn | DATETIME2 NULL | P7, deletion date (+7 days) |
| DeletionDeleteFiles | BIT NULL | P7, also delete Drive / App-Data files |

**KhataCurrencies** (money types; built-in rows seeded, custom rows per user)
| Column | Type | Notes |
|---|---|---|
| Id | INT IDENTITY PK | |
| OwnerUserId | INT NULL FK → KhataUsers | NULL = built-in for everyone |
| Code | NVARCHAR(10) | `INR`, `AED`… or custom e.g. `GOLD-G`; unique per owner |
| Symbol | NVARCHAR(10) | `₹`, `د.إ`, `g` |
| Name | NVARCHAR(50) | |
| Decimals | TINYINT | 0–3 |
| IsIso | BIT | 1 for real ISO 4217 codes (UI uses `Intl.NumberFormat`) |
| Sort | INT | |

**KhataBooks**
| Column | Type | Notes |
|---|---|---|
| Id | INT IDENTITY PK | |
| OwnerUserId | INT FK → KhataUsers | |
| Name | NVARCHAR(100) | unique per owner |
| CurrencyId | INT FK → KhataCurrencies | locked once the book has a transaction |
| Sort | INT | order in the switcher |
| NotifyMePush / NotifyMeEmail | BIT DEFAULT 0 | requirement 5, own alerts |

**KhataGoogleConnections** (one active row per user; requirement 6a)
| Column | Type | Notes |
|---|---|---|
| Id | INT IDENTITY PK | |
| UserId | INT FK → KhataUsers | unique where `RevokedOn IS NULL` |
| GoogleSubject | VARCHAR(64) | Google `sub`, stable account ID |
| GoogleEmail | NVARCHAR(256) | shown as "Connected as …" |
| RefreshTokenEncrypted | NVARCHAR(MAX) | Data Protection encrypted; never returned to the UI |
| Scopes | NVARCHAR(500) | must contain `drive.file` |
| RootFolderId | VARCHAR(100) NULL | `SnapKhata` folder in this user's Drive |
| Status | TINYINT | 1 connected, 2 needs reconnect, 3 revoked |
| LastError | NVARCHAR(500) NULL | |
| ConnectedOn / RevokedOn | DATETIME2 / NULL | |

**KhataOAuthStates**: Id, Purpose (1 Login, 2 ConnectDrive, 3 ChangeDrive), UserId NULL (empty for Login), State (unique), CodeVerifier (encrypted), NextUrl, ExpiresOn, ConsumedOn.

**KhataContacts**
| Column | Type | Notes |
|---|---|---|
| Id | INT IDENTITY PK | |
| BookId | INT FK → KhataBooks | |
| OwnerUserId | INT FK → KhataUsers | copied from the book, for fast ownership checks |
| Name | NVARCHAR(100) | |
| Mobile | VARCHAR(15) NULL | links to a KhataUsers row when that person logs in |
| Email | NVARCHAR(256) NULL | |
| Address | NVARCHAR(300) NULL | |
| Note | NVARCHAR(500) NULL | |
| ContactType | TINYINT | 1 customer, 2 supplier |
| AllowContactEntries | BIT DEFAULT 0 | requirement 4 |
| RowVersion | ROWVERSION | edit conflict check (S2) |
| LinkedUserId | INT NULL FK → KhataUsers | set when the contact logs in; enables shared view and copies (Q2) |
| ShareStatus | TINYINT DEFAULT 0 | 0 not on app, 1 invited, 2 accepted, 3 declined, 4 left (Q8) |
| ShareRespondedOn | DATETIME2 NULL | |
| BalanceMinor | BIGINT DEFAULT 0 | cached, in the book's currency smallest unit; positive = you will get |
| DueDate | DATE NULL | P2, "collect by"; cleared when the balance reaches 0 |
| LastReminderOn | DATETIME2 NULL | P1 |

**KhataTransactions**
| Column | Type | Notes |
|---|---|---|
| Id | INT IDENTITY PK | |
| ContactId | INT FK | |
| EntryType | TINYINT | 1 gave (credit), 2 got (payment) |
| AmountMinor | BIGINT | > 0, in the book currency's smallest unit (`× 10^Decimals`) |
| Note | NVARCHAR(500) NULL | |
| EntryDate | DATE | |
| AddedByUserId | INT FK | owner or linked contact |
| Version | INT DEFAULT 1 | edits increase it; history in `KhataTransactionHistory` |
| Source | TINYINT DEFAULT 1 | 1 app, 2 OkCredit import, 3 other file import, 4 restore (§3.15, P6) |
| ImportJobId | INT NULL FK → KhataImportJobs | which import created it (for undo) |
| ImportFingerprint | CHAR(64) NULL | SHA-256 row fingerprint; unique per book where not NULL (no double import) |
| RowVersion | ROWVERSION | edit conflict check (S2) |

**KhataAttachments**: Id, TransactionId FK, FileName, ContentType, SizeBytes, Md5, TempPath NULL, Sort. This is the photo itself. Where it is stored is in `KhataStoredFiles`.

**KhataStoredFiles** (one row per stored copy of a photo or `ledger.json`)
| Column | Type | Notes |
|---|---|---|
| Id | INT IDENTITY PK | |
| UserId | INT FK | whose storage holds this copy |
| ContactId | INT FK | which ledger |
| AttachmentId | INT NULL FK | empty for `ledger.json` |
| Role | TINYINT | 1 Home (owner), 2 Copy (contact) |
| Provider | TINYINT | 1 Local, 2 GoogleDrive |
| GoogleConnectionId | INT NULL FK | when Provider = GoogleDrive |
| FileId | NVARCHAR(400) NULL | Drive file ID, or relative path under `App-Data` |
| FolderId | NVARCHAR(400) NULL | |
| SyncStatus | TINYINT | 0 pending, 1 synced, 2 failed, 3 moving, 4 moved |
| SyncAttempts | INT | |

**KhataStorageMigrations**: Id, UserId, FromProvider, FromConnectionId NULL, ToProvider, ToConnectionId NULL, Status (1 running, 2 completed, 3 partial), TotalFiles, MovedFiles, LeftBehindFiles, StartedOn, CompletedOn, LastError.

**KhataTransactionHistory**: Id, TransactionId, Version, snapshot JSON, ChangedByUserId, ChangedOn.

**KhataNotificationPrefs**: Id, ContactId FK (unique), `NotifyPush`, `NotifySms`, `NotifyEmail` (BIT, **default 0**), `ConsentChangedByUserId`, `ConsentChangedOn`.

**KhataPushSubscriptions**: Id, UserId, Endpoint, P256dh, Auth, UserAgent.

**KhataOtps**: Id, Identifier, Channel, CodeHash, ExpiresOn, Attempts, ConsumedOn, RequestIp.

**KhataSessions**: Id, UserId, RefreshTokenHash, DeviceId, UserAgent, LoggedInOn (for the 10-minute "fresh login" check when setting a PIN), ExpiresOn, RevokedOn.

**KhataPinProofs**: Id, UserId, SessionId, Purpose (1 EditTransaction, 2 DeleteTransaction, 3 ChangePin, 4 DisconnectDrive, 5 ChangeDriveAccount, 6 DeleteContact, 7 AllowContactEntries, 8 DeleteBook), TargetId, ProofHash, ExpiresOn (2 min), UsedOn.

**KhataPinAttempts**: Id, UserId, SessionId, Purpose (Unlock / Proof / Set), Success, RequestIp, AttemptedOn.

**KhataIdempotencyKeys** (S1): Id, UserId, IdempotencyKey (unique per user), Endpoint, RequestHash, ResponseStatus, ResponseBody (JSON), ExpiresOn (24 h). A cleanup job deletes expired rows.

**KhataAuditLog** (S4): Id, UserId NULL, BookId NULL, ContactId NULL, Action (e.g. `PinChanged`, `AllowEntriesOn`, `ShareAccepted`, `DriveMoved`, `RateLimited`, `PaymentDetailsChanged`, `AccountDeletionScheduled`), Details (JSON, private data masked), RequestIp, UserAgent, CreatedOn.

**KhataReminders** (P1): Id, ContactId FK, SentByUserId, Channel (1 WhatsApp, 2 WhatsApp + QR), BalanceMinor (at that moment), CreatedOn.

**KhataExports** (P4): Id, UserId, BookId, ContactId NULL (NULL = whole book), Format (1 PDF, 2 CSV, 3 JSON), FromDate, ToDate, Status (0 queued, 1 ready, 2 failed), StoredFileId NULL FK → KhataStoredFiles, Error, CreatedOn.

**KhataRestoreJobs** (P6): Id, UserId, SourceFolderId, NewBookId NULL, Status (0 queued, 1 running, 2 done, 3 failed), TotalEntries, RestoredEntries, Error, StartedOn, CompletedOn.

PIN-proof purposes added by P1–P9 and the import: 9 `ChangePaymentDetails`, 10 `RestoreBook`, 11 `DeleteAccount`, 12 `UndoImport`.

**KhataImportJobs** (§3.15): Id, UserId, BookId, SourceApp (1 OkCredit, 2 Khatabook, 3 other), Mode (1 full history, 2 opening balances), ProfileId NULL, Status (0 uploaded, 1 mapped, 2 dry-run ready, 3 importing, 4 done, 5 failed, 6 undone), TotalRows, ImportedRows, SkippedRows, DuplicateRows, BalanceMismatches, ReportJson, UndoUntil (+7 days), StartedOn, CompletedOn, Error.

**KhataImportFiles**: Id, ImportJobId FK, FileName, FileHash (SHA-256; same hash again → "already imported"), Kind (xlsx / xls / csv / pdf), StoredFileId FK → KhataStoredFiles (original kept in the user's storage), SizeBytes.

**KhataImportRows** (staging for the dry run; deleted 7 days after the import): Id, ImportJobId, FileId, RowNumber, RawJson, ContactName, Mobile, EntryDate, EntryType, AmountMinor, Note, FileBalanceMinor NULL, Fingerprint, Status (ok / skipped / duplicate / error), Error.

**KhataImportProfiles**: Id, UserId, SourceApp, Name, HeaderSignature (hash of the header row, used to pick the profile automatically), MappingJson (column → field, date format, sign convention).

The import CREATE scripts are `033_KhataImportProfiles.sql`, `034_KhataImportJobs.sql`, `035_KhataImportFiles.sql` and `036_KhataImportRows.sql`.

Extra indexes for P2/P5: `KhataContacts(BookId, DueDate)`, `KhataContacts(BookId, Name)`, `KhataTransactions(ContactId, EntryDate, CreatedOn)`. The extra CREATE scripts are `030_KhataReminders.sql`, `031_KhataExports.sql` and `032_KhataRestoreJobs.sql`.

**KhataNotificationLog**: Id, UserId/ContactId, Channel, Template, Status, ProviderMessageId, Error.

Indexes: `KhataBooks(OwnerUserId)`, `KhataCurrencies(OwnerUserId, Code)` unique, `KhataContacts(BookId)`, `KhataContacts(OwnerUserId)`, `KhataContacts(LinkedUserId, ShareStatus)`, `KhataContacts(Mobile)`, `KhataContacts(Email)`, `KhataTransactions(ContactId, EntryDate DESC)`, `KhataStoredFiles(SyncStatus)`, `KhataStoredFiles(UserId)`, `KhataOtps(Identifier, CreatedOn)`, `KhataGoogleConnections(UserId)`.

---

## 7. API endpoints (`Thakurg.API`)

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/khata/auth/otp/send` | Send email or SMS OTP |
| POST | `/api/khata/auth/otp/verify` | Verify, create user if new, issue tokens, report Drive status |
| POST | `/api/khata/auth/refresh` | Rotate refresh token |
| POST | `/api/khata/auth/logout` | Revoke session |
| GET | `/api/khata/auth/google/start?next=` | Sign in with Google: redirect to Google (login + Drive consent) |
| POST | `/api/khata/auth/pin` | Set or reset the app PIN (fresh login within 10 min required) |
| POST | `/api/khata/auth/pin/unlock` | Check PIN → access token with `pin: true` |
| POST | `/api/khata/auth/pin/proof` | Check PIN → single-use 2-minute proof for one edit/delete |
| PUT | `/api/khata/auth/pin/change` | Change PIN (new PIN). **Requires `X-Khata-Pin-Proof`** made with the old PIN |
| GET | `/api/khata/google/status` | `{ storageProvider, status, googleEmail, migration }` for the current user |
| GET | `/api/khata/google/connect?next=` | Returns the Google auth URL for **this** user (connect or change account) |
| GET | `/api/khata/google/callback` | One Google redirect for login, connect and change; saves this user's token, creates their `SnapKhata` folder, starts a move if needed |
| POST | `/api/khata/storage/skip` | Skip Drive → `StorageProvider = Local` (`App-Data`) |
| DELETE | `/api/khata/google?moveToLocal=true` | Disconnect: move files to `App-Data`, then revoke the token. **Requires `X-Khata-Pin-Proof`** (also needed to start a Google account change) |
| GET | `/api/khata/storage/migration` | Progress of the current move |
| POST | `/api/khata/storage/migration/retry` | Retry files left behind |
| GET / PUT | `/api/khata/me` | Profile and own notification switches |
| POST | `/api/khata/me/verify-second` | Link the other identifier (email or mobile) by OTP |
| GET | `/api/khata/currencies` | Built-in money types + my custom ones |
| POST / PUT / DELETE | `/api/khata/currencies/{id?}` | Add, edit or remove **my** custom money type (not if a book uses it) |
| GET | `/api/khata/books` | My books with totals |
| POST | `/api/khata/books` | Create book `{ name, currencyId }` |
| PUT | `/api/khata/books/{id}` | Rename; change money type only while the book has no entries |
| DELETE | `/api/khata/books/{id}` | Soft delete. **Requires `X-Khata-Pin-Proof`** |
| GET | `/api/khata/books/{bookId}/contacts` | Contacts of a book with balances and totals |
| POST | `/api/khata/books/{bookId}/contacts` | Add contact |
| GET / PUT | `/api/khata/contacts/{id}` | Details, edit |
| DELETE | `/api/khata/contacts/{id}` | Soft delete. **Requires `X-Khata-Pin-Proof`** |
| PUT | `/api/khata/contacts/{id}/permissions` | `{ allowContactEntries }`. Turning it **on** requires `X-Khata-Pin-Proof` |
| PUT | `/api/khata/contacts/{id}/notifications` | `{ push, sms, email }` |
| GET | `/api/khata/contacts/{id}/transactions?page=` | Ledger, newest first |
| POST | `/api/khata/contacts/{id}/transactions` | Add entry (multipart: JSON + up to 1–3 photos) |
| PUT / DELETE | `/api/khata/transactions/{id}` | Edit or soft delete (rules in §5.5). **Requires header `X-Khata-Pin-Proof`** |
| GET | `/api/khata/transactions/{id}/history` | Version history |
| GET | `/api/khata/attachments/{id}` | Stream a photo from the owner's Drive after a permission check |
| GET | `/api/khata/shared` | Invitations and accepted ledgers where I am the contact |
| POST | `/api/khata/shared/{contactId}/accept` · `/decline` · `/leave` | Answer or leave a shared ledger |
| POST / DELETE | `/api/khata/push-subscriptions` | Register or remove a web-push device |
| POST | `/api/khata/contacts/{id}/reminders` | P1: build the WhatsApp text + `wa.me` URL, log the reminder |
| PUT | `/api/khata/contacts/{id}/due-date` | P2: set or clear the due date |
| GET | `/api/khata/books/{bookId}/due` | P2: due-today and overdue contacts |
| GET / PUT | `/api/khata/me/payment` | P3: UPI ID, payee name, QR source. **PUT requires `X-Khata-Pin-Proof`** |
| POST / DELETE | `/api/khata/me/payment/qr` | P3: upload or remove your own QR image. **Requires `X-Khata-Pin-Proof`** |
| GET | `/api/khata/me/payment/qr.png?amount=` | P3: the QR to show (uploaded or generated, with the amount if given) |
| POST | `/api/khata/exports` | P4: `{ bookId, contactId?, format, from, to }` → export ID |
| GET | `/api/khata/exports/{id}` · `/download` | P4: status, then the file |
| GET | `/api/khata/books/{bookId}/search?q=&from=&to=&type=&addedBy=&hasPhoto=` | P5: search contacts and entries in a book |
| GET | `/api/khata/contacts/{id}/transactions?from=&to=&type=&q=` | P5: ledger filters; each entry has `runningBalanceMinor` |
| GET | `/api/khata/restore/sources` | P6: books found in my storage |
| POST | `/api/khata/restore` | P6: start a restore as a new book. **Requires `X-Khata-Pin-Proof`** |
| GET | `/api/khata/restore/{jobId}` | P6: progress |
| PUT | `/api/khata/me/daily-summary` | P8: on/off, time, channels |
| POST | `/api/khata/books/{bookId}/contacts/import` | P9: save up to 100 reviewed contacts in one call |
| POST | `/api/khata/me/delete` | P7: schedule deletion. **Requires `X-Khata-Pin-Proof` + fresh login** |
| POST | `/api/khata/me/delete/cancel` | P7: cancel during the 7 days |
| POST | `/api/khata/imports` | §3.15: upload OkCredit files (multipart) → job ID, detected columns, suggested mapping |
| PUT | `/api/khata/imports/{id}/mapping` | Save the column mapping, date format, target book and mode → runs the dry run |
| GET | `/api/khata/imports/{id}/preview?status=` | Dry-run summary, balance check and rows (paged, filter by error/skip/duplicate) |
| PUT | `/api/khata/imports/{id}/rows/{rowId}` | Fix or exclude one row before importing |
| POST | `/api/khata/imports/{id}/run` | Start the import (background job) |
| GET | `/api/khata/imports` · `/{id}` | My imports, progress and final report |
| POST | `/api/khata/imports/{id}/undo` | Undo within 7 days. **Requires `X-Khata-Pin-Proof`** |
| GET / DELETE | `/api/khata/import-profiles` | Saved column mappings |

**Common to all endpoints:**
- Every endpoint has a rate-limit policy (§3.12).
- Every create (`POST` transaction, contact or book) accepts `X-Idempotency-Key` (S1).
- Every edit sends `rowVersion` and gets 409 on a conflict (S2).

Following CLAUDE.md:
- Every response text uses a `MessageCodes.Khata*` constant and a row in `001_Messages.sql` (en/hi/ar).
- Every UI text uses i18n keys in a new `khata` row of `009_Translations.sql`.
- Use `BusinessException` for errors, and keep to the Controller → Service → Repository layers, ≤ 6 constructor parameters, and regions.
- NuGet packages: `Google.Apis.Drive.v3` and `Google.Apis.Auth`, plus `Microsoft.AspNetCore.Authentication.JwtBearer`.

**Local configuration** (`appsettings.Development.json` for non-secrets; secrets through `dotnet user-secrets`, never in git):
```json
"Khata": {
  "UiBaseUrl": "http://localhost:4200",
  "Jwt": { "Issuer": "thakurg-local", "AccessMinutes": 15, "RefreshDays": 30 },
  "Google": { "RedirectUri": "https://localhost:7001/api/khata/google/callback", "RootFolderName": "SnapKhata" },
  "LocalFiles": { "Root": "../../../App-Data/khata" },
  "Otp": { "Sender": "Dev", "ExpiryMinutes": 5, "MaxAttempts": 5 },
  "Pin": { "MinLength": 4, "MaxLength": 6, "LockAfterMinutes": 5, "MaxTries": 5, "LockoutMinutes": 15, "ResetAfterTries": 10, "ProofSeconds": 120 },
  "Limits": { "MaxBooks": 20, "MaxCustomCurrencies": 20, "MaxContactsPerBook": 5000, "MaxPhotosPerEntry": 3, "MaxPhotoBytes": 2097152, "UploadsPerDay": 200, "OtpCooldownSeconds": 45, "OtpPer10Min": 3, "OtpPerDay": 10, "EmailsPerDay": 300 }
},
"RateLimiting": {
  "Khata": {
    "OtpSend":    { "Permit": 5,   "WindowSeconds": 600 },
    "OtpVerify":  { "Permit": 10,  "WindowSeconds": 600 },
    "Google":     { "Permit": 10,  "WindowSeconds": 60 },
    "Refresh":    { "Permit": 30,  "WindowSeconds": 60 },
    "Pin":        { "Permit": 10,  "WindowSeconds": 60 },
    "Write":      { "Permit": 60,  "WindowSeconds": 60, "Burst": 20 },
    "Upload":     { "Permit": 20,  "WindowSeconds": 60 },
    "Read":       { "Permit": 300, "WindowSeconds": 60 },
    "Attachment": { "Permit": 120, "WindowSeconds": 60 },
    "Storage":    { "Permit": 5,   "WindowSeconds": 600 },
    "Push":       { "Permit": 10,  "WindowSeconds": 60 },
    "Reminder":   { "Permit": 30,  "WindowSeconds": 3600 },
    "Export":     { "Permit": 10,  "WindowSeconds": 3600 },
    "Restore":    { "Permit": 3,   "WindowSeconds": 86400 },
    "Account":    { "Permit": 5,   "WindowSeconds": 3600 },
    "Import":     { "Permit": 5,   "WindowSeconds": 3600 }
  }
}
```
```
dotnet user-secrets set "Khata:Jwt:Secret" "<random 64 chars>"
dotnet user-secrets set "Khata:Otp:HmacSecret" "<random 64 chars>"
dotnet user-secrets set "Khata:Google:ClientId" "<from Google Cloud Console>"
dotnet user-secrets set "Khata:Google:ClientSecret" "<from Google Cloud Console>"
dotnet user-secrets set "Khata:WebPush:VapidPrivateKey" "<generated>"
```

---

## 8. Screen mockups (mobile first, 320 px+)

**A. `/khata` landing (public)**
```
┌────────────────────────────────┐
│ ☰ thakurg.com        EN ▾      │
├────────────────────────────────┤
│  <h1> SnapKhata — free digital │
│       udhar khata              │
│  Track who owes you. Add bills │
│  with photos, saved in YOUR    │
│  own Google Drive.             │
│                                │
│  [  Login with mobile / email ]│
│                                │
│  ✓ Unlimited customers         │
│  ✓ Bill photos in your Drive   │
│  ✓ Shared ledger, you control  │
│  ✓ Alerts by app, SMS, email   │
│  ✓ PIN lock, install as an app │
│                                │
│  [ ⬇ Install SnapKhata ]       │  ← Chrome/Edge; iPhone shows guide
│                                │
│  FAQ ▸ Is it free? ▸ Can you   │
│        see my Drive? (No)      │
└────────────────────────────────┘
```

**B. `/khata/login`**
```
┌────────────────────────────────┐
│  [ G  Continue with Google ]   │  ← login + Drive in one step
│  ─────────── or ───────────    │
│  ( Email )  ( Mobile )         │  ← segmented switch
│  Email  [ you@example.com    ] │
│         [   Send code   ]      │
│ ─ after sending ─              │
│  Code   [ _ _ _ _ _ _ ]        │
│  Resend in 0:45                │
│         [   Verify     ]       │
└────────────────────────────────┘
```

**B2. `/khata/set-pin`** (right after the first login)
```
┌────────────────────────────────┐
│  🔒 Create your app PIN         │
│  You'll enter it every time    │
│  you open SnapKhata and before │
│  editing an entry.             │
│                                │
│  PIN        ● ● ● ○ ○ ○        │  ← 4–6 digits
│  Confirm    ○ ○ ○ ○ ○ ○        │
│  ┌───┬───┬───┐                 │
│  │ 1 │ 2 │ 3 │  number pad,    │
│  │ 4 │ 5 │ 6 │  keys ≥ 44 px   │
│  │ 7 │ 8 │ 9 │                 │
│  │   │ 0 │ ⌫ │                 │
│  └───┴───┴───┘                 │
│  [ Save PIN ]                  │
│  ⚠ Too easy — avoid 1234, 0000 │  ← only on weak PIN
└────────────────────────────────┘
```

**B3. `/khata/unlock`** (every app open, and after 5 minutes in the background)
```
┌────────────────────────────────┐
│        SnapKhata               │
│   Hi John 👋 Enter your PIN     │
│        ● ● ○ ○                 │
│  ┌───┬───┬───┐                 │
│  │ 1 │ 2 │ 3 │                 │
│  │ 4 │ 5 │ 6 │                 │
│  │ 7 │ 8 │ 9 │                 │
│  │   │ 0 │ ⌫ │                 │
│  └───┴───┴───┘                 │
│  ✗ Wrong PIN, 3 tries left     │  ← only after a wrong try
│  Forgot PIN?    Not John? Log out│
└────────────────────────────────┘
```

**C. `/khata/connect-drive`** (after the first login, and when reconnect is needed)
```
┌────────────────────────────────┐
│  Save your bills in your own   │
│  Google Drive                  │
│                                │
│  📁 SnapKhata keeps bill photos │
│  and a backup of your khata in │
│  a "SnapKhata" folder in YOUR  │
│  Google Drive.                 │
│                                │
│  🔒 We can only see files       │
│  SnapKhata creates — never the │
│  rest of your Drive.           │
│                                │
│  [ G  Connect Google Drive ]   │  → Google account chooser
│      ★ Strongly recommended    │
│                                │
│  Skip for now                  │  ← text button
│  ⚠ If you skip, bills are kept │
│  only on this SnapKhata server │
│  (App-Data). You can connect   │
│  Drive later from Profile.     │
│                                │
│ ─ after success ─              │
│  ✓ Connected as                │
│    ramesh@gmail.com            │
│  [ Continue ]                  │
│                                │
│ ─ if Drive permission unticked │
│  ⚠ Drive permission is needed  │
│    to save bill photos.        │
│  [ Try again ]                 │
└────────────────────────────────┘
```

**D. `/khata/app/b/:bookId/contact/:id` ledger**
```
┌────────────────────────────────┐
│ ⚠ Google Drive disconnected —  │  ← only when NeedsReconnect
│   [Reconnect]                  │
│ ℹ Bills saved on server only — │  ← only when StorageProvider = Local
│   [Connect Drive]              │
│ ← Ramesh Kirana      🔍 ⬇ ⚙   │  ← search · statement (P4) · settings
│   Balance: you will get ₹1,250 │
│   Collect by 15-11-2026  ✎     │  ← due date (P2)
│ [ 🟢 Send reminder ] [ 📷 QR ] │  ← WhatsApp (P1), share with QR
│ ( All ▾ ) ( This month ▾ )     │  ← filters (P5)
│ ─────────────────────────────  │
│ 29-10-2026            GOT ₹250 │
│   UPI · added by Ramesh        │
│   Balance after: ₹1,250        │  ← running balance (P5)
│ 28-10-2026         GAVE ₹1,500 │
│   Rice 25kg   📷 ✓ in Drive    │
│   Balance after: ₹1,500        │
│ ─────────────────────────────  │
│ [ YOU GAVE ₹ ]  [ YOU GOT ₹ ]  │
└────────────────────────────────┘
  Add entry sheet (no PIN needed):
  Amount [ ₹ ______ ]  Date [29-10-2026]
  Note   [ __________ ]  [ 📷 Add photo ]
  [ Save ]

  Tap an existing entry → [ ✏ Edit ] [ 🗑 Delete ] [ 🕘 History ]
  Edit/Delete → PIN sheet first:
  ┌──────────────────────────────┐
  │ 🔒 Enter PIN to edit this    │
  │    entry (₹1,500, 28-10-2026)│
  │        ● ● ○ ○               │
  │   number pad …               │
  │ [ Cancel ]                   │
  └──────────────────────────────┘
  → correct PIN → edit form opens (proof valid 2 min)
```

**E. `/khata/app` contacts**
```
┌────────────────────────────────┐
│ SnapKhata  [Kirana shop ₹ ▾] 👤│  ← book switcher
│   ▸ Kirana shop   ₹ INR        │
│   ▸ Home          ₹ INR        │
│   ▸ Dubai trade   د.إ AED      │
│   + New book                   │
│ ┌──────────────┬─────────────┐ │
│ │ You will get │ You will give││
│ │ ₹ 12,500     │ ₹ 3,200     │ │  ← this book only
│ └──────────────┴─────────────┘ │
│ 🔍 Search contacts & entries   │
│ ( Customers ) ( Suppliers )    │
│ ( Due today 2 ) ( Overdue 1 )  │  ← P2
│ ( Shared with me )             │
│ ─────────────────────────────  │
│ Ramesh Kirana       ₹ 1,250 ↗  │
│ 2 days ago          you'll get │
│ ─────────────────────────────  │
│ Sita Dairy            ₹ 800 ↙  │
│ today              you'll give │
│                                │
│ [ 📱 Import ] [ + Add contact ]│  ← Import only on Android (P9)
│ [ 💳 Pay me (QR) ]             │  ← INR books (P3)
└────────────────────────────────┘
```

**E3b. `/khata/app/import/okcredit` (§3.15)**
```
Step 1 — Upload                       Step 2 — Check columns
┌────────────────────────────────┐   ┌────────────────────────────────┐
│ ← Import from OkCredit         │   │ Column        →  Means         │
│ 1. Open web.okcredit.in        │   │ "Date"        → [ Date      ▾] │
│ 2. Reports → Download → Excel  │   │ "Customer"    → [ Name      ▾] │
│    (or a customer statement)   │   │ "Mobile"      → [ Mobile    ▾] │
│ [ 📤 Choose files ]            │   │ "Credit"      → [ You gave  ▾] │
│  .xlsx .xls .csv .pdf ≤10 MB   │   │ "Payment"     → [ You got   ▾] │
│ ⓘ Bill photos can't be moved  │   │ "Balance"     → [ Check only▾] │
│ Mode (•) Full history          │   │ Date format  ( DD-MM-YYYY ▾ )  │
│      ( ) Opening balances only │   │ Preview: 03-02-2023 Ramesh …   │
│ Into (•) New book ( ) Existing │   │ [ Next ]                       │
└────────────────────────────────┘   └────────────────────────────────┘

Step 3 — Check before import          Step 4 — Done
┌────────────────────────────────┐   ┌────────────────────────────────┐
│ 42 customers · 6 suppliers     │   │ ✓ 1,315 entries imported       │
│ 1,318 entries                  │   │   into "Imported from OkCredit │
│ 03-02-2023 → 29-10-2026        │   │   30-10-2026"                  │
│ ✓ 46 balances match OkCredit   │   │ 3 skipped · 0 duplicates       │
│ ⚠ 2 differ  [ View ]           │   │ Originals saved to Drive ✓     │
│ ⚠ 3 rows skipped [ Fix ]       │   │ [ Open book ]                  │
│ [ Import 1,315 entries ]       │   │ Undo possible until 06-11-2026 │
└────────────────────────────────┘   └────────────────────────────────┘
```

**E4. "Pay me" screen and payment details (P3)**
```
┌────────────────────────────────┐   Profile → Payment details
│ ← Pay John Traders             │   ┌────────────────────────────┐
│      ┌────────────────┐        │   │ UPI ID  [ john@okhdfc    ] │
│      │ ▓▓ ▓ ▓▓▓ ▓ ▓▓ │        │   │ Name    [ John Traders   ] │
│      │ ▓ QR CODE  ▓▓ │        │   │ QR      (•) Generate from ID│
│      │ ▓▓ ▓▓ ▓ ▓▓ ▓ │        │   │         ( ) Upload my QR   │
│      └────────────────┘        │   │         [ 📤 Choose image ] │
│   john@okhdfc  [ Copy ]        │   │ [ Save ]  (asks for PIN)   │
│   Amount (optional) [ ₹ ___ ]  │   └────────────────────────────┘
│   [ Share QR ]                 │
└────────────────────────────────┘
```

**E5. Statement export (P4) and Import review (P9)**
```
┌────────────────────────────────┐   ┌────────────────────────────┐
│ ← Statement: Ramesh Kirana     │   │ ← Import contacts (3)      │
│ Period ( This month ▾ )        │   │ ☑ Mohan  +91 98…           │
│ From [01-10-2026] To [30-10-26]│   │ ☑ Geeta  +91 97…           │
│ Format ( PDF ) ( CSV )         │   │ ☐ Ramesh +91 98…           │
│ [ Create ]                     │   │   Already in book — skip   │
│ ✓ Ready · [Download] [Share]   │   │ [ Add 2 contacts ]         │
│   Saved to Drive ✓             │   └────────────────────────────┘
└────────────────────────────────┘
```

**E2. `/khata/app/books/new`**
```
┌────────────────────────────────┐
│ ← New book                     │
│ Name        [ Kirana shop    ] │
│ Money type  [ ₹ INR        ▾ ] │
│   ₹ INR · د.إ AED · ﷼ SAR · $ USD│
│   … · Gold (g) (mine)          │
│   + Add money type             │
│ ⓘ Can't be changed after the   │
│   first entry.                 │
│ [ Create book ]                │
└────────────────────────────────┘
  + Add money type sheet:
  Code [ GOLD-G ]  Symbol [ g ]  Name [ Gold grams ]
  Decimals ( 0 | 1 | 2 | 3 )   [ Save ]
```

**E3. `/khata/app/shared`**
```
┌────────────────────────────────┐
│ ← Shared with me               │
│ ── Invitations ──              │
│ John Traders · Kirana shop     │
│ keeps a khata with you         │
│ [ Accept ]   [ Decline ]       │
│ ── Accepted ──                 │
│ Sita Dairy · Milk book         │
│ You will give ₹ 800       ›    │
│ ── Declined (1) ▸ ──           │
└────────────────────────────────┘
```

**F. `/khata/app/b/:bookId/contact/:id/settings`**
```
┌────────────────────────────────┐
│ ← Contact settings             │
│ Name    [ Ramesh Kirana     ]  │
│ Mobile  [ +91 98765 43210   ]  │
│ Email   [                   ]  │
│ Type    ( Customer ▾ )         │
│ ── Permissions ──              │
│ Ramesh can add entries   [ ○ ] │  ← off by default
│ Sharing: ✓ Accepted            │  ← Not on SnapKhata / Invited / Accepted / Declined / Left
│ ℹ A copy of this ledger with   │  ← only when Accepted
│   photos is saved to Ramesh's  │
│   own storage.                 │
│ (turning the switch ON asks for PIN)│
│ ── Notify Ramesh by ──         │
│ App notification         [ ○ ] │
│ SMS        (coming soon) [ ○ ] │
│ Email                    [ ○ ] │  ← disabled until email entered
│ [ Save ]       [ Delete ]      │
└────────────────────────────────┘
```

**G. `/khata/app/profile`**
```
┌────────────────────────────────┐
│ ← Profile                      │
│ Name      [ John Traders    ]  │
│ Email     john@… ✓ verified    │
│ Mobile    [ Add & verify ]     │
│ Google login  john@gmail.com ✓ │  ← or [ Link Google sign-in ]
│ ── Storage ──                  │
│ Google Drive: john@gmail.com   │  ← or "This server (App-Data)"
│ [ Change account ] [Disconnect]│  ← change = MOVE files (Q3)
│ Moving files… 120 / 300 ▓▓▓░░  │  ← only during a move
│ ── Notify me when a contact ── │
│    adds an entry               │
│ App notification         [ ○ ] │
│ Email                    [ ○ ] │
│ ── Daily summary (P8) ──       │
│ On [ ○ ]  Time [ 21:00 ]       │
│ Push [ ○ ]  Email [ ○ ]        │
│ ── Payment details (P3) ── ›   │
│ ── Backup ──                   │
│ [ Restore a book ]  (P6)       │
│ [ Import from OkCredit ] (§3.15)│
│ ── Security ──                 │
│ [ Change PIN ]   [ Lock now ]  │
│ ── App ──                      │
│ [ ⬇ Install SnapKhata ]        │  ← hidden when already installed
│ ── Devices ──                  │
│ Chrome · Android  (this one)   │
│ [ Log out ]  [ Log out all ]   │
│ ── Danger zone ──              │
│ [ Delete my account ]  (P7)    │
└────────────────────────────────┘
  During the 7 days (P7), on every screen:
  ⚠ Your account will be deleted on 06-11-2026. [ Cancel deletion ]
```
Dates are shown as `DD-MM-YYYY` (`date-format` rule). All switches and buttons are ≥ 44 px, and the Arabic layout is right to left.

---

## 9. Build phases (all local)

| Phase | Scope |
|---|---|
| **1 – Core** | `Khata*` SQL tables in `thakurg-meta` (scripts 010–029), feature switch (S5), **rate-limit policies + account limits** (§3.12), idempotency (S1), conflict check (S2), balance in the same SQL transaction (S3), audit log (S4), masked logs (S7), email/mobile OTP with `DevOtpSender`, JWT + refresh cookie, **app PIN (set, unlock, lock after background, PIN proof for edit/delete and the other risky actions)**, **books + money types** (seed `KhataCurrencies`, custom types), contacts CRUD, transactions with always-editable history, `/khata`, `/khata/login`, `/khata/set-pin`, `/khata/unlock`, `/khata/app` screens |
| **1b – Import from OkCredit** | Right after Core, so your existing OkCredit data can move in early: upload, column mapping + saved profiles, dry run with balance check, import job, undo, double-import protection (§3.15). Needs a sample OkCredit export first |
| **1c – Installable app** | `public/khata/manifest.webmanifest` + icons, manifest swap on `/khata` pages, install button / iOS guide, check that `/api/khata/**` is not cached by the service worker |
| **2 – Storage** | `IFileStore` with `LocalFileStore` (`App-Data`, git-ignored) first, then the Google OAuth client (Testing mode, add yourself and a second test account), connect/skip/callback/disconnect, `/khata/connect-drive`, photo upload, background sync, `ledger.json`, reconnect banner |
| **3 – Sign in with Google** | `/api/khata/auth/google/start`, shared callback, account linking by verified email, "Continue with Google" button |
| **4 – Shared ledger** | Invitations (accept/decline/leave), Shared-with-me, allow-entries switch, contact entries labelled, **JSON + photo copies to the contact's storage after accept** |
| **5 – Move files** | Storage migration job: change Google account, Local → Drive, Drive → Local, progress and retry |
| **6 – Notifications** | Web push (production build on localhost), Brevo email, per-contact and own preferences; SMS switch shown as coming soon |
| **7 – Shop features** | P1 WhatsApp reminder, P2 due dates, P3 UPI ID + QR (generated or uploaded) and the "Pay me" screen, P5 search, filters and running balance, P9 import from phone |
| **8 – Records and account** | P4 statements (PDF + CSV), P6 restore from backup, P7 delete account (7-day grace), P8 daily summary |
| **9 – Later** | Real SMS (Firebase or MSG91 + DLT), fingerprint/face unlock (WebAuthn), Play Store (TWA), offline queue |

Upload checks (S6) and time zone (S8) are part of phases 1–2. Tests (S9) are written in every phase.

**Test case for requirement 6a:** log in as Ramesh in Chrome profile 1 and connect `ramesh.test@gmail.com`. Log in as John in Chrome profile 2 (or incognito) and connect `john.test@gmail.com`. Add entries with photos for each. Each Google account's Drive must contain only its own `SnapKhata` folder. Then John adds Ramesh as a contact (allow on), and Ramesh adds an entry with a photo. Check:
- The photo and `ledger.json` land in **John's** Drive under `contacts/`, **and** a copy lands in **Ramesh's** Drive under `shared/`.
- A third user, Sita, presses **Skip**. Her files appear under `App-Data/khata/users/{id}/`.
- Sita later connects Drive. Her files move into her Drive, and `App-Data/khata/users/{id}/` is emptied.
- John changes to another Google account. All files move, and the old Drive's `SnapKhata` folder is removed.
- Sign in with Google with Ramesh's Gmail logs in to the same user he created with email OTP.

**Test cases for the PIN and install:**
- A first login goes to set PIN. Close the tab and open it again, and the unlock screen appears. Calling `GET /api/khata/contacts` with a `pin: false` token returns 403.
- Leave the app in the background for more than 5 minutes, and it is locked on return.
- Editing an entry asks for the PIN. Sending `PUT /api/khata/transactions/{id}` without `X-Khata-Pin-Proof`, or reusing an old proof, returns 403.
- 5 wrong PINs → locked for 15 minutes. 10 → logged out, and a new PIN must be set.
- In a production build on `localhost`, the "Install SnapKhata" button installs the app. The installed icon opens `/khata/app` in its own window and shows the unlock screen. The Speed Test app installs separately.
- In DevTools → Application → Cache Storage, no `/api/khata` responses are cached.

**Test cases for books, money types and invitations:**
- Create the books "Kirana shop" (INR) and "Dubai trade" (AED). Totals never mix, and each book has its own Drive folder.
- Add a custom money type "Gold (g)" with 3 decimals. An entry of 1.250 is stored as 1250 and shown as "1.250 g".
- Changing a book's money type after its first entry is refused.
- Ramesh logs in, and John's ledger shows only as an invitation: no data, no copies, and he can't add entries. After Accept, the ledger opens and copies appear in Ramesh's Drive. After Leave, syncing stops and the copies remain.
- Deleting a contact or book, turning on "can add entries", changing the PIN and disconnecting Drive each ask for the PIN. Without a proof, the API returns 403.

## 10. Local setup checklist
1. Google Cloud Console → new project → enable **Google Drive API**.
2. OAuth consent screen: External, app name "SnapKhata (local)", scopes `openid`, `email` and `drive.file`, and add the test users' Gmail addresses.
3. Credentials → OAuth client ID → *Web application*. Redirect URI: `https://localhost:7001/api/khata/google/callback`.
4. `dotnet user-secrets` for the client ID/secret, JWT secret, OTP secret and VAPID key (§7).
5. Run the new SQL scripts with `DatabaseInitializer` against `(localdb)\MSSQLLocalDB`.
6. Nothing to set up for local files: SnapKhata writes to `App-Data/khata/` (created on first use), and `App-Data/` is already in `.gitignore`.
7. Start the API (`https://localhost:7001`) and UI (`http://localhost:4200`). OTP codes appear in the API console.

## 11. Decisions (answered by the owner, 30-10-2026)
| # | Question | Decision |
|---|---|---|
| Q1 | Must Google Drive be connected before using the ledger? | **Strongly recommended, with a Skip option.** Skipped users' files are saved in `App-Data/khata/` (git-ignored) (§3.2, §5.6) |
| Q2 | Copy shared-ledger files to the contact's storage? | **Yes, JSON and photos** (§3.1, §5.4, §5.6) |
| Q3 | Changing Google account: what happens to the old files? | **Move** to the new Drive: copy, verify, then delete from the old one (§5.8) |
| Q4 | Edit window for entries | **Always editable** by the person who added the entry, with full history (§3.6, §5.5) |
| Q5 | Add Sign in with Google? | **Yes**, next to mobile and email OTP (§5.2b) |
| Q6 | PIN for other risky actions too? | **Yes, all:** change PIN, disconnect or change Drive, delete contact or book, turn on "can add entries" (§3.7) |
| Q7 | PIN rules | **Keep defaults:** 4–6 digits, lock after 5 min in background, 5 wrong → 15 min lock, 10 wrong → logout and new PIN (§3.7) |
| Q8 | Must a contact accept a shared ledger? | **Yes, Accept/Decline first.** Nothing is shown or copied before accepting (§3.9, §5.11) |
| Q9 | Several books per user? | **Yes, multiple books now**, with a book switcher (§3.10, §5.12) |
| Q10 | Currency | **A money type per book**, from a built-in list, plus **"+ Add money type"** for the user's own types (§3.11) |
| Q11 | Rate limiting | **Wherever needed:** request limits per IP/user on every khata endpoint, and account limits in SQL for OTP, PIN, uploads, notifications, email and Drive (§3.12) |
| Q12 | Where transactions are saved | **SQL Server, same `thakurg-meta` database, new `Khata*` tables.** Drive/App-Data hold only photos and the JSON backup (§6) |
| P1 | WhatsApp reminder | **Yes** (§3.14) |
| P2 | Due date per contact | **Yes** (§3.14) |
| P3 | UPI payment | **Yes: UPI ID + QR code**, generated from the ID or uploaded by the owner (§3.14) |
| P4 | Statement export | **Yes: PDF + CSV** (§3.14) |
| P5 | Search, filters, running balance | **Yes** (§3.14) |
| P6 | Restore from backup | **Yes**, always as a new book (§3.14) |
| P7 | Delete my account | **Yes, 7-day grace period** (§3.14) |
| P8 | Daily summary | **Yes**, off by default (§3.14) |
| P9 | Import from phone contacts | **Yes**, Android Contact Picker (§3.14) |
| Q14 | Build order | **Start Phase 1 (core) now.** The OkCredit importer (1b) is built once the owner's Excel export is in `App-Data/khata/imports/okcredit/` (git-ignored), and then imports that real data |
| Q15 | Look and feel | **Own app look** for `/khata/app/**`: a simple app top bar with the book switcher, no site footer, green khata colours. The public `/khata` landing page keeps the site header and footer (SEO) |
| Q16 | Google OAuth client | **Not created yet.** Phase 1 runs without it (OTP login, files in `App-Data`). Step-by-step setup is given when Phase 2 starts |
| Q17 | Git | **No commits by the developer/assistant.** The owner works on their own branch, reviews and commits |
| Q13 | Migrate from OkCredit | **Yes: import from OkCredit's own Excel/PDF exports** with column mapping, a dry run + balance check, double-import protection and 7-day undo. No scraping or private API. Bill photos can't be migrated (§3.15) |

## Sources
- [Google Drive API scopes: `drive.file` is the recommended, non-sensitive scope (Google)](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- [OAuth 2.0 for web server apps: offline access, refresh tokens (Google)](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Refresh token expiration, incl. 7 days in Testing status (Google)](https://developers.google.com/identity/protocols/oauth2#expiration)
- [Service accounts have no Drive storage quota (Fivetran)](https://fivetran.com/docs/activations/destinations/available-destinations/google-drive/troubleshooting/service-accounts-storage-quota)
- [storageQuotaExceeded for service account (Google Developer forum)](https://discuss.google.dev/t/storagequotaexceeded-the-users-drive-storage-quota-has-been-exceeded-for-service-account/104375)
- [DLT registration guide (Message Central)](https://www.messagecentral.com/en-in/blog/a-complete-guide-on-dlt-registration)
- [SMS OTP pricing India (Message Central)](https://www.messagecentral.com/blog/sms-otp-pricing-india)
- [MSG91 driver pricing note (Botble)](https://docs.botble.com/sms-gateways/drivers/msg91.html)
- [Identity Platform / Firebase phone auth pricing (Google)](https://goo.gle/3CVD0vz)
- [Best OTP service providers 2026 (Authgear)](https://www.authgear.com/post/best-otp-service-providers/)
- [OkCredit web app: 1-click reports, PDF or Excel](https://web.okcredit.in/login)
- [OkCredit home](https://okcredit.in/en/), [OkCredit payment reminders](https://okcredit.in/payment-reminder-app), [OkCredit App Store listing](https://apps.apple.com/in/app/okcredit-udhar-bahi-khata/id1488748286)
- [Email API free tiers compared (Nylas)](https://cli.nylas.com/guides/email-api-free-tiers-compared), [Resend vs Brevo (Toolradar)](https://toolradar.com/compare/resend-vs-brevo)

Prices and free-tier limits come from third-party pages as of October 2026. Check each provider's official pricing page before you commit.
