# SnapTracker: screen mockups

These are mockups of the screens in [`snaptracker-plan.md`](snaptracker-plan.md). Phones come first (360 px wide is shown; every screen also works at 320 px), then the desktop layout.

- **Same look as the other apps:** the frame, skins, icons and top-bar menus match SnapKhata and My Tasks.
- **Shared menus:** `⊕ ◐ 🌐` in the top bar stands for the shared **install / theme / language** menus (`<app-site-tools />`). They are the same component, so they look and behave identically in every app.
- **Text and colours:** every text comes from the `tracker` translation keys (en, hi, ar). Colours come from the active skin (Agni shown).

---

## 1. Frame: phone

```
┌──────────────────────────────────────┐
│ [✦] SnapTracker      🔔3  ⊕  ◐  🌐  │  ← top bar: logo, alerts bell, shared menus
│ ● Tracking enabled ›                 │  ← status pill (opens Privacy)
├──────────────────────────────────────┤
│                                      │
│            (page content)            │
│                                      │
├──────────────────────────────────────┤
│  ⌂        ≡ 2       (＋)    🛡    👤  │  ← tab bar: Home · Activity · ADD · Privacy · Profile
│ Home   Activity            Privacy  Me │     the centre ＋ opens "Add" (paste SMS / manual)
└──────────────────────────────────────┘
```
- The badge on **Activity** shows the number of transactions waiting for review.
- **Alerts** opens from the bell, and **How it works** from Privacy.
- **Settings** is Settings › General › SnapTracker, reached from the rail, from Profile, or from the ⚙ link inside the Alerts panel.

## 2. Frame: desktop (≥ 1024 px)

```
┌───────────────┬──────────────────────────────────────────────────────────┐
│ [✦] SnapTracker│ Dashboard                          🔔3   ⊕   ◐   🌐       │
│ by SnapKhata  ├──────────────────────────────────────────────────────────┤
│               │                                                          │
│  ⌂ Dashboard  │                                                          │
│  ≡ Activity 2 │                     (page content)                       │
│  🛡 Privacy    │                                                          │
│  🔔 Alerts     │                                                          │
│  ◇ How it works│                                                          │
│  ⚙ Settings ↗ │   ← opens /master?tab=general&app=tracker                 │
│               │                                                          │
│ ┌───────────┐ │                                                          │
│ │Linked to  │ │  ← only when the Khata link is on (Q2)                   │
│ │SnapKhata: │ │                                                          │
│ │Personal   │ │                                                          │
│ └───────────┘ │                                                          │
│ (◯) Super     │  ← avatar → /profile                                     │
│     Profile   │                                                          │
└───────────────┴──────────────────────────────────────────────────────────┘
```

---

## 3. Dashboard (`/tracker/app`)

```
 Good evening
 Your money, tracked automatically          [⟳ Sync]  [＋ Add]

┌─ Turn on automatic SMS tracking ─────────────────────────┐   ← only while not enabled
│ ✉  SnapTracker reads only bank and UPI alerts.           │
│    OTPs and personal messages are never read.            │
│                                   [🛡 Turn on tracking]   │
└──────────────────────────────────────────────────────────┘

┌─ SPENT THIS MONTH · NOV 2026 ──────── ▲ 12% vs last month ┐
│  ₹18,450                                                  │
│  Today ₹1,250   Income ₹52,000   Detected for you 46      │
│  ╱╲__╱╲___╱‾‾╲_____╱╲    (daily spend line)               │
└───────────────────────────────────────────────────────────┘
┌──────────────┐┌──────────────┐   ← KPI tiles, 2 per row on phones,
│ ↓ Expenses   ││ ↑ Income     │     tap opens the filtered Activity list
│ ₹42,300      ││ ₹1,04,000    │
│ 38 debits    ││ 6 credits    │
└──────────────┘└──────────────┘
┌──────────────┐┌──────────────┐
│ ⚠ Needs check││ ⧉ Duplicates │
│ 2  Tap to    ││ 5  · 31 SMS  │
│    review    ││ ignored      │
└──────────────┘└──────────────┘
┌─ Monthly analytics ─────────── ■ Spent ■ Income ──────────┐
│  ▇▅  ▆▃  ▇▆  ▅▂  ▆▇  ▃▂        Jun … Nov                   │
└───────────────────────────────────────────────────────────┘
┌─ Where it went ─────────────────────────────────────────── ┐
│   ◔ donut     🍜 Food 32% · 🛒 Groceries 18% · 🛍 Shopping …│
└───────────────────────────────────────────────────────────┘
┌─ Needs your check ─────────────────────────── [See all 2] ┐
│ 🧾 GUPTA GENERAL   Payment of ₹1,140 …    −₹1,140  [✓][✕] │
└───────────────────────────────────────────────────────────┘
┌─ Recently detected ──────────────────────────── [View all]┐
│ 🍜 Zomato   You spent ₹450 on food at Zomato.     −₹450    │
│    Today 13:05 · UPI · ⚡ SMS · 📒 Khata      Auto-approved │
└───────────────────────────────────────────────────────────┘
```
- **Empty state** (no transactions yet): *"No transactions yet"*, with **[Paste an SMS]** and **[Add manually]**.
- The prototype's *"Load sample history"* stays as a **demo-only** button in Mojito.

---

## 4. Activity (`/tracker/app/transactions`)

```
 Detected transactions
 ┌ 🔍 Search merchant, amount, SMS…  ┐ [＋ Add]

 [All 46] [Auto-detected 40] [Manual 6] [Pending 2] [Credit 6] [Debit 38] [Duplicates 5] [Ignored 1]   ← scroll sideways on phones

 TODAY                                              −₹1,700
 ┌───────────────────────────────────────────────────────────┐
 │ 🍜 Zomato                                          −₹450   │
 │    You spent ₹450 on food at Zomato.       Auto-approved   │
 │    13:05 · UPI · ⚡ SMS · 📒 Khata                          │
 ├───────────────────────────────────────────────────────────┤
 │ 🧾 GUPTA GENERAL                                  −₹1,140  │
 │    Payment of ₹1,140 to Gupta General.   Needs verification│
 └───────────────────────────────────────────────────────────┘
 YESTERDAY                                         +₹4,201
 …
```

## 5. Transaction details (drawer; full screen on phones)

```
┌ Transaction details ─────────────────────────────── ✕ ┐
│ 🍜 Zomato                                             │
│ [Food & Dining] [Needs verification]                  │
│ −₹450  (Debit · expense)                              │
│ ⚠ SnapTracker is 72% sure about this one.             │
│   Check the details and confirm, or edit.             │
│ ✦ DESCRIPTION · GENERATED                             │
│   You spent ₹450 on food at Zomato.                   │
│ ─────────────────────────────────────────────         │
│ Date      05-11-2026 13:05       Method   UPI         │
│ Account   ••4821                 Ref      4301…       │
│ Confidence ████████░░ 72%                             │
│ ─ Original SMS (AD-HDFCBK) ───────────────────────    │
│ Sent [Rs.450.00] from HDFC Bank A/C [*4821] to        │
│ [zomato@hdfcbank] on 05-11-26. Ref [4301…]            │   ← found parts highlighted
│ ─────────────────────────────────────────────         │
│ [✓ Confirm] [✎ Edit] [🏷 Category] [✕ Ignore] [🗑]      │
└───────────────────────────────────────────────────────┘
```
- **Duplicate:** an info banner says *"Same payment as Zomato on 05-11-2026"*, with a **[Not a duplicate]** button.
- **Category:** the sheet has a tick box, *"Always use this category for Zomato"*.

## 6. Add (the centre ＋ button): a bottom sheet with two tabs

```
┌ Add a transaction ───────────────────────────── ✕ ┐
│ [ Paste an SMS ]  [ Enter manually ]               │
│                                                    │
│ Paste a bank or UPI alert                          │
│ ┌────────────────────────────────────────────────┐ │
│ │ Sent Rs.450.00 from HDFC Bank A/C *4821 to …   │ │
│ └────────────────────────────────────────────────┘ │
│ Sender (optional)  [ AD-HDFCBK      ]              │
│                                   [ Read message ] │
│ ── What happened ───────────────────────────────── │
│ ✓ Sender is a listed bank   HDFC Bank · Service    │
│ ✓ No one-time password                             │
│ ✓ Details  ₹450 · debit · UPI · ••4821 · Ref 4301… │
│ ✓ Category Food & Dining · known merchant          │
│ ✓ No duplicate                                     │
│ ✅ Saved and auto-approved (92% sure).   [ Open ]   │
└────────────────────────────────────────────────────┘
```
- **Enter manually:** amount, debit/credit (ChoiceGroup), merchant, category, method, date (DD-MM-YYYY), note → **[Save]**.
- **Share (phase 2):** sharing an SMS to the installed app opens this sheet already filled in.

---

## 7. Privacy (`/tracker/app/privacy`)

```
 Permissions & privacy
 You control what SnapTracker reads

┌ SMS tracking ─────────────────────────────────────────────┐
│ Status  ● Tracking enabled · since 01-11-2026 09:12        │
│ [⏸ Pause tracking]   [Revoke SMS access]                    │
└───────────────────────────────────────────────────────────┘
┌ Why SMS access? ──────────────────────────────────────────┐
│ Banks and UPI apps send an SMS for every payment …         │
└───────────────────────────────────────────────────────────┘
┌ What is processed ─────────┐┌ Never collected ────────────┐
│ ✓ Sender, time, alert text  ││ ✕ OTPs and codes            │
│ ✓ Amount, merchant, last 4  ││ ✕ Personal chats            │
│ ✓ The transaction made      ││ ✕ Promotions, contacts, …   │
└─────────────────────────────┘└─────────────────────────────┘
┌ Ignored so far ──────────────────────────────────────────┐
│ OTPs 12 · Promotions 17 · Failed payments 1 · Other 3     │
└───────────────────────────────────────────────────────────┘
┌ Supported senders ───────────────────────────────────────┐
│ HDFC Bank · ICICI Bank · State Bank of India · … · Amazon Pay │
└───────────────────────────────────────────────────────────┘
 Your data: download, delete texts, delete all → [Profile ›]
```

## 8. Alerts (`/tracker/app/alerts`, and the panel under the bell)

```
 Notifications                                   [Mark all read]
 ⚡ New transaction detected   Zomato −₹450              2 min ago
 🔎 Needs verification         GUPTA GENERAL −₹1,140     1 h ago
 🧬 Duplicate message detected PhonePe alert for Zomato  1 h ago
 ⏸ Tracking paused                                       Yesterday
                                     Alert settings ⚙ → Settings › General
```

---

## 9. Settings › General › SnapTracker (shared Settings page)

```
┌ SnapTracker ─────────────────────────────────────────────┐
│ App name (super admin)  EN [SnapTracker] HI [...] AR [...] │
│                                                    [Save]   │
│ Automatic approval                                          │
│ [ Review everything | Smart (recommended) | Approve all ]   │   ← ChoiceGroup (selected = filled)
│ Auto-approve at [ 85 ] % confidence or more                 │
│                                                             │
│ SnapKhata link                       (only if Khata is here) │
│ Post confirmed transactions to Khata          [ ●── ]        │
│ Default Khata book                    [ Personal      ▾ ]    │
│                                                             │
│ Alerts                                                      │
│ Push notifications on the phone               [ ●── ]        │
│ ⚡ New transaction detected                    [ ●── ]        │
│ 🏷 Automatically categorised                   [ ●── ]        │
│ 🔎 Needs verification                          [ ●── ]        │
│ 🧬 Duplicate message detected                  [ ●── ]        │
│ ⛔ Tracking permission revoked                 [ ●── ]        │
│ ⏸ Tracking paused or resumed                  [ ●── ]        │
│ 🔄 Synchronisation completed                   [ ●── ]        │
│                                                    [Save]   │
└────────────────────────────────────────────────────────────┘
```

## 10. Profile › SnapTracker part (shared Profile page)

```
┌ SnapTracker ─────────────────────────────────────────────┐
│ 38 transactions keep their original SMS text.             │
│ [⬇ Download my data (JSON)]                                │
│ [Delete original SMS texts, keep transactions]             │
│ [🗑 Delete all SnapTracker data]      ← confirm dialog      │
│                                                           │
│ Connected phones (phase 4)                                │
│ Pixel 7 · last seen today 09:12            [Disconnect]   │
└───────────────────────────────────────────────────────────┘
```

---

## 11. Public page (`/tracker`, prerendered, in the sitemap)

```
┌──────────────────────────────────────────────────────────┐
│ [✦] SnapTracker                         ⊕  ◐  🌐  [Log in]│
├──────────────────────────────────────────────────────────┤
│  Every bank SMS becomes a tidy transaction. Automatically.│  ← the page's one <h1>
│  SnapTracker reads only bank and UPI alerts, works out     │
│  what you paid for, and files it in your Khata.            │
│  [ Open SnapTracker ]   [ Create a free account ]          │
│                                                            │
│  ┌ AD-HDFCBK · now ───────────────┐   ✦ →   ┌ 🍜 Zomato ─┐ │
│  │ Sent Rs.450.00 … zomato@…      │         │ −₹450      │ │
│  └────────────────────────────────┘         └────────────┘ │
│  ✓ OTPs and personal messages never leave the phone        │
│  ✓ Plain-language descriptions and categories              │
│  ✓ Duplicate alerts caught for you                         │
│  How it works · Privacy · FAQ                              │
└──────────────────────────────────────────────────────────┘
```
