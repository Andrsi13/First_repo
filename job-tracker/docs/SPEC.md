# Job Tracker — Technical Specification

Version 0.3 · 2026-10-15 — updated with answers and real work-order screenshots

A browser app for an internet field technician who is paid per job. It records each completed job, calculates weekly earnings from a price list, subtracts deductions and fuel, and shows statistics.

---

## 1. Goals

| # | Goal |
|---|------|
| G1 | Log a completed job in under 15 seconds on a phone, one-handed, in the truck. |
| G2 | Always show **this week's** earnings at a glance (weeks run **Sunday → Saturday**). |
| G3 | Show how much was **earned (gross)**, how much was **deducted**, how much was **spent on gas**, and what is left (**net**). |
| G4 | Let the tech set a **price for each job code** once, so job value is calculated automatically. |
| G5 | Work offline; data stays on the device, with backup/export. |

### Non-goals (v1)
- User accounts, cloud sync, multi-device sharing.
- Integration with the employer's dispatch system.
- Tax reports (CSV export covers this need for now).

---

## 2. Glossary

| Term | Meaning |
|------|---------|
| **Job type** | Kind of work order. Defaults: **NC** (New Connect), **RC** (Reconnect), **Rescue**, **COS** (Change of Service), **TC** (Trouble Call, optional). Editable list — types can be added, renamed, hidden. |
| **Level** | Number of services on the job: **Single**, **Double**, **Triple**. Every type has levels **except COS**, which has one flat price. Each type has a "has levels" switch in Settings. |
| **Code** | A job type + level pair, e.g. `NC-Single`, or just the type for flat-price types (`COS`). Each code has a price. |
| **Work-order code** | The text shown in the employer app, e.g. `NC HSD`, `RESCUE SI SP`. Mapped to a code by scan keywords (§3.3). |
| **Job ID** | The work-order number from the employer. |
| **Charge / deduction** | Money the employer takes out of pay — mainly **equipment** charges. Defaults are editable in Settings. |
| **Fuel expense** | Money the tech spends on gas. |
| **Week** | Sunday 00:00 → Saturday 23:59, local time. |

---

## 3. Screens

Based on the hand-drawn sketch.

### 3.1 Home — "This week"

```
┌─────────────────────────────────┐
│ ‹  This week            ⚙  ›    │
│    Oct 11 – Oct 17              │
│                                 │
│        $1,563                   │   ← gross earned this week
│     27 jobs completed           │
│                                 │
│  Deducted  −$156                │
│  Fuel      −$84                 │
│  Net        $1,323              │
│─────────────────────────────────│
│  List of jobs completed         │
│  Thu Oct 15            $212     │
│   NC · Triple  #4471823  $85    │
│   123 Main St                   │
│   ⛽ Fuel 12.4 gal       −$42    │
│  Wed Oct 14 ...                 │
│─────────────────────────────────│
│  [📷 Scan]  [🚚 Fuel]  [📊]  [ + ] │
└─────────────────────────────────┘
```

- `‹` / `›` move to previous / next week; title shows "This week", "Last week", or the date range.
- ⚙ opens **Settings**.
- List grouped by day (newest first), each day shows its total.
- Tapping a job or expense opens it for **edit** / delete (every field can be changed, including type, level, date and price).
- Bottom bar:
  - **📷 Scan** — photograph the work order screen → auto-fill a new job (§3.3).
  - **🚚 Fuel** — add a fuel expense (§3.4).
  - **📊 Stats** — statistics screen (§3.5).
  - **+ Manual add** — add a job by hand (§3.2).

### 3.2 Add / Edit job

Flow from the sketch: **Job type → Level → Job ID & address**. Shown on one sheet so it stays quick:

1. **Job type** — big buttons: `NC` `RC` `Rescue` `COS` (+ `TC` or any custom type).
2. **Level** — `Single` `Double` `Triple`. Hidden for types without levels (COS).
3. **Job ID** — text, numeric keyboard.
4. **Address** — text.
5. **Date** — defaults to today.
6. **Price** — auto-filled from the price list for the chosen code; can be overridden for this job.
7. **Notes** — optional.

Validation: job type and level required; price ≥ 0. A warning (not a block) if the same Job ID already exists.

### 3.3 Scan screen

The source is the employer's tech app. Two screens are supported:

**A. Single job card** (current job)

```
Job #208332
3 - 4 PM        🔧 RESCUE SI SP
👤 Craig Walker
📍 4565 S 23rd St Apt 4, Milwaukee, WI
   53221
```

**B. End of Day Summary** (several jobs)

```
Jobs Completed (2)
Job #208173
8 - 9 AM        🔧 NC HSD
📍 3767 E Morris Ave Rm 1, Cudahy, WI
   53110
Job #173271
1 - 2 PM        🔧 NC HSD
📍 3149 S Howell Ave, Milwaukee, WI 53207
```

Flow:

1. Tap **📷 Scan** → choose **Take photo** or **Pick screenshot**. A screenshot of the work app (same phone) gives the cleanest result; a photo of another phone's screen also works.
2. Text is read **on the device** (OCR, Tesseract.js — nothing is uploaded).
3. The text is split into blocks, one per `Job #NNNNNN`.
4. For each block the app detects job ID, work-order code → type + level, address, and the time window.
5. **One job found** → the Add Job sheet opens pre-filled.
   **Several jobs found** → a review list opens: each row shows job ID, detected code, address and price, with a checkbox and an edit button. Rows whose job ID is already saved are unchecked and marked "already added". **Add selected** saves them all.
6. Date defaults to today (editable for the whole batch).

Detection rules:

| Field | Rule | Example |
|-------|------|---------|
| Job ID | `Job\s*#\s*(\d{5,})` | `Job #208332` → `208332` |
| Work-order code | uppercase text on the same line after the time window `\d+ - \d+ (AM\|PM)` | `RESCUE SI SP`, `NC HSD` |
| Job type | words of the code matched against each type's **scan keywords** | `RESCUE` → Rescue, `NC` → NC |
| Level | words matched against level keywords (editable): Single = `SP`, Double = `DP`, Triple = `TP` (single / double / triple play). Other words (`HSD`, `SI` = self install, `RESIDENTIAL`…) are ignored. | `RESCUE SI SP` → Rescue · Single; `RESIDENTIAL SP` → Single; `NC HSD` → NC · level not detected |
| Address | text from a line starting with a house number up to and including the 5-digit ZIP (may wrap to the next line) | `4565 S 23rd St Apt 4, Milwaukee, WI 53221` |
| Time window | `\d{1,2} - \d{1,2} (AM\|PM)` — stored for reference | `3 - 4 PM` |

Customer name is **not** stored.

If the type or level is not found in the code (e.g. `NC HSD` has no SP/DP/TP), the job is still created with the type/level left empty and highlighted, so the tech picks them by hand. A "Show recognized text" link shows the raw OCR text.

**Scan keywords** are editable in Settings so new work-order codes can be mapped without code changes (e.g. teach the app a new type word).

### 3.4 Fuel / deduction

- **Kind**: `Fuel` or `Deduction`.
- **Fuel**: date (default today), amount $, gallons (optional), note.
- **Deduction**: pick a charge from the **default charges list** (e.g. "Modem not returned — $75"); the amount is pre-filled from Settings and can be changed for this entry. Optional link to a job ID, note.
- Saved entries can be edited / deleted like jobs.

### 3.5 Statistics

- Period: This week · Last week · This month · Last month · This year · All time.
- Totals: jobs, gross, deductions, fuel, net, average $ per job, average $ per working day.
- Breakdown by job type and by code (count and $).
- Bar chart: net per week for the last 12 weeks.

### 3.6 Settings (⚙)

From the sketch: *"Put price for each code"* and *"Set up charges"*.

- **Price list** — table: job types × levels, one $ field per cell (one field for flat-price types like COS).
- **Job types** — add, rename, hide; switch "has levels" on/off; edit scan keywords. A type used by existing jobs cannot be deleted, only hidden. TC (Trouble Call) is included but can be hidden.
- **Level keywords** — words that mean Single / Double / Triple in work-order codes.
- **Charges** — the default deductions list. Each charge has:
  - name (e.g. "Modem not returned", "Remote", "Cable box")
  - default amount $
  - how it applies:
    - **One-time** (default) — used when logging a deduction (§3.4); the most common for equipment.
    - **$ per week** — applied automatically to weeks with at least one job.
    - **$ per job** — applied automatically to every job.
    - **% of gross** — applied automatically.
  - all fields editable; charges can be added and removed. Changing a default does not change deductions already logged.
- **Data** — Export backup (JSON), Import backup, Export CSV, Delete all data.

---

## 4. Calculations

For any period P (a week, month, etc.):

```
gross        = Σ job.price                        for jobs in P
pctCharges   = Σ (charge.amount% × gross)          for "% of gross" charges
perJob       = Σ (charge.amount × jobCount)        for "$ per job" charges
perWeek      = Σ (charge.amount × weeksWorked)     for "$ per week" charges
oneTime      = Σ expense.amount                    for Deduction expenses in P
deducted     = pctCharges + perJob + perWeek + oneTime
fuel         = Σ expense.amount                    for Fuel expenses in P
net          = gross − deducted − fuel
```

- `weeksWorked` = number of Sunday-start weeks in P that have at least one job — weekly charges are **only applied to weeks worked**.
- Job price is **saved on the job** when it is created, so later price-list changes do not rewrite history.
- Recurring charges use the **current** charge settings.
- Money is stored in **cents (integers)** to avoid rounding errors; shown as `$1,563.00`.
- Week start: `date − date.getDay()` (Sunday = 0), local time.

---

## 5. Data model

Stored in the browser (`localStorage`, key `jobtracker.v1`) as one JSON document:

```jsonc
{
  "version": 1,
  "settings": {
    "jobTypes": [
      { "code": "NC",     "name": "New Connect",       "hasLevels": true,  "keywords": ["NC"],          "hidden": false },
      { "code": "RC",     "name": "Reconnect",         "hasLevels": true,  "keywords": ["RC"],          "hidden": false },
      { "code": "Rescue", "name": "Rescue",            "hasLevels": true,  "keywords": ["RESCUE"],      "hidden": false },
      { "code": "COS",    "name": "Change of Service", "hasLevels": false, "keywords": ["COS"],         "hidden": false },
      { "code": "TC",     "name": "Trouble Call",      "hasLevels": true,  "keywords": ["TC", "TROUBLE"], "hidden": false }
    ],
    "levels": [
      { "name": "Single", "keywords": ["SP"] },
      { "name": "Double", "keywords": ["DP"] },
      { "name": "Triple", "keywords": ["TP"] }
    ],
    "rates": { "NC|Single": 4500, "NC|Double": 6000, "NC|Triple": 8500, "COS": 2500 },   // cents
    "charges": [   // starts empty — the tech adds their own, e.g.:
      { "id": "c1", "name": "Modem not returned", "kind": "oneTime", "amount": 7500 }
    ]
  },
  "jobs": [
    {
      "id": "j_…",            // internal id
      "date": "2026-10-15",   // local date, YYYY-MM-DD
      "type": "NC",
      "level": "Single",      // null for flat-price types
      "jobId": "208173",      // employer work-order number
      "woCode": "NC HSD",     // original work-order code (from scan, optional)
      "timeWindow": "8 - 9 AM",
      "address": "3767 E Morris Ave Rm 1, Cudahy, WI 53110",
      "source": "scan",       // "scan" | "manual"
      "updatedAt": "…",
      "price": 8500,          // cents, snapshot
      "notes": "",
      "createdAt": "2026-10-15T14:02:11Z"
    }
  ],
  "expenses": [
    { "id": "e_…", "date": "2026-10-15", "kind": "fuel",       "amount": 4200, "gallons": 12.4, "note": "" },
    { "id": "e_…", "date": "2026-10-14", "kind": "deduction", "chargeId": "c1", "name": "Modem not returned", "amount": 7500, "jobId": "208173", "note": "" }
  ]
}
```

---

## 6. Technical design

| Area | Choice | Why |
|------|--------|-----|
| Stack | Plain HTML + CSS + JavaScript, no build step | Simple to edit and host; runs anywhere. |
| Storage | `localStorage` | Offline, private, no server. Data is small (thousands of jobs ≈ < 1 MB). |
| Offline | Web app manifest + service worker | "Add to Home Screen", works with no signal. |
| OCR | Tesseract.js (loaded only when Scan is used) | Runs on-device; free. First scan downloads ~10 MB language data, then cached. |
| Hosting | GitHub Pages from this repo | Free HTTPS (required for camera + service worker). |
| Layout | Mobile-first, max width 480 px, large tap targets, light/dark theme | Used on a phone in the field. |

### File layout

```
job-tracker/
  index.html        app shell and screens
  style.css         styles
  app.js            state, calculations, rendering
  ocr.js            scan + text parsing
  sw.js             service worker (offline cache)
  manifest.json     PWA manifest
  icon.svg          app icon
  docs/SPEC.md      this document
```

### Module responsibilities (`app.js`)

- `store` — load / save / migrate the JSON document.
- `dates` — `toISO`, `weekStart(date)`, `weekRange`, period helpers.
- `calc` — `summarize(jobs, expenses, settings, period)` → `{ gross, deducted, fuel, net, count, byType }`.
- `ui` — render Home, Stats, sheets; event handlers.

---

## 7. Data safety

- Browser storage can be cleared by the user or the OS. Mitigations:
  - Request persistent storage (`navigator.storage.persist()`).
  - **Export backup** button; reminder banner if no backup in 14 days.
  - Import restores a backup (replace, after confirmation).
- No data leaves the phone (OCR is local).

---

## 8. Milestones

| # | Scope |
|---|-------|
| M1 | Home week view, manual add / **edit** / delete job, price list, job types, local storage. |
| M2 | Fuel & deductions, default charges list in Settings, net calculation. |
| M3 | Statistics screen, CSV / JSON export & import. |
| M4 | Scan: single job card + End of Day Summary batch import, scan keywords. |
| M5 | Offline / installable (PWA), GitHub Pages deploy. |

---

## 9. Decisions (answered 2026-10-15)

| Question | Answer |
|----------|--------|
| Job type meanings | NC = New Connect, RC = Reconnect, Rescue, COS = Change of Service — confirmed. Possibly one more: Trouble Call (TC). |
| Levels | All types have Single / Double / Triple **except COS** (flat price). |
| Editing | Every job must be editable. |
| Deductions | Mainly **equipment**; default charges must be editable in Settings. |
| Weekly charges | Only for weeks worked. |
| Scan source | Employer tech app: job card and End of Day Summary (see §3.3). |
| Extra pay items | None. |
| Work-order level | Only SP / DP / TP decide the level (single / double / triple play). `HSD` is ignored. `SI` = self install (ignored; `RESCUE SI SP` = Rescue, single play). |
| Default charges | Start empty; the tech adds their own equipment charges in Settings. |
