# Job Tracker — Technical Specification

Version 0.1 (draft) · 2026-10-15

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
| **Job type** | Kind of work order. Defaults: **NC** (New Connect), **RC** (Reconnect), **Rescue** (trouble call / repair), **COS** (Change of Service). Editable list. |
| **Level** | Number of services on the job: **Single**, **Double**, **Triple** (e.g. internet / TV / phone). |
| **Code** | A job type + level pair, e.g. `NC-Triple`. Each code has a price. |
| **Job ID** | The work-order number from the employer. |
| **Charge / deduction** | Money the employer takes out of pay (fees, insurance, equipment, chargebacks). |
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
- Tapping a job or expense opens it for edit / delete.
- Bottom bar:
  - **📷 Scan** — photograph the work order screen → auto-fill a new job (§3.3).
  - **🚚 Fuel** — add a fuel expense (§3.4).
  - **📊 Stats** — statistics screen (§3.5).
  - **+ Manual add** — add a job by hand (§3.2).

### 3.2 Add / Edit job

Flow from the sketch: **Job type → Level → Job ID & address**. Shown on one sheet so it stays quick:

1. **Job type** — big buttons: `NC` `RC` `Rescue` `COS`.
2. **Level** — `Single` `Double` `Triple`.
3. **Job ID** — text, numeric keyboard.
4. **Address** — text.
5. **Date** — defaults to today.
6. **Price** — auto-filled from the price list for the chosen code; can be overridden for this job.
7. **Notes** — optional.

Validation: job type and level required; price ≥ 0. A warning (not a block) if the same Job ID already exists.

### 3.3 Scan screen

1. Opens the phone camera (or photo picker).
2. Text is read from the photo **on the device** (OCR, Tesseract.js — nothing is uploaded).
3. App tries to detect: job type, level, job ID, address.
4. Opens the Add Job sheet pre-filled; the tech checks and taps Save.

Detection rules (best effort):

| Field | Looks for |
|-------|-----------|
| Job type | `NC` / "new connect", `RC` / "reconnect", "rescue" / "trouble" / "repair", `COS` / "change of service" |
| Level | "single" / "double" / "triple", "1/2/3 play" |
| Job ID | text after "Job", "Order", "WO", "Ticket", "#"; otherwise the longest number with 6+ digits |
| Address | a line starting with a house number followed by a street word (St, Ave, Rd, Dr, Ln, Blvd, Ct, Way…) |

If nothing is detected, the sheet opens empty with the recognized text shown so the tech can copy from it.

### 3.4 Fuel / expense

- **Kind**: `Fuel` or `Chargeback` (a one-time deduction, e.g. a failed-job chargeback).
- **Date** (default today), **Amount $**, **Gallons** (fuel only, optional), **Note**.

### 3.5 Statistics

- Period: This week · Last week · This month · Last month · This year · All time.
- Totals: jobs, gross, deductions, fuel, net, average $ per job, average $ per working day.
- Breakdown by job type and by code (count and $).
- Bar chart: net per week for the last 12 weeks.

### 3.6 Settings (⚙)

From the sketch: *"Put price for each code"* and *"Set up charges"*.

- **Price list** — table: job types × levels, one $ field per cell.
- **Job types** — add, rename, remove (cannot remove a type used by existing jobs; it is hidden instead).
- **Charges** — list of recurring deductions, each with:
  - name (e.g. "Company fee", "Truck insurance")
  - kind: **% of gross**, **$ per job**, or **$ per week**
  - amount
- **Data** — Export backup (JSON), Import backup, Export CSV, Delete all data.

---

## 4. Calculations

For any period P (a week, month, etc.):

```
gross        = Σ job.price                        for jobs in P
pctCharges   = Σ (charge.amount% × gross)          for "% of gross" charges
perJob       = Σ (charge.amount × jobCount)        for "$ per job" charges
perWeek      = Σ (charge.amount × weeksWorked)     for "$ per week" charges
chargebacks  = Σ expense.amount                    for Chargeback expenses in P
deducted     = pctCharges + perJob + perWeek + chargebacks
fuel         = Σ expense.amount                    for Fuel expenses in P
net          = gross − deducted − fuel
```

- `weeksWorked` = number of Sunday-start weeks in P that have at least one job.
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
      { "code": "NC",     "name": "New Connect",       "hidden": false },
      { "code": "RC",     "name": "Reconnect",         "hidden": false },
      { "code": "Rescue", "name": "Rescue",            "hidden": false },
      { "code": "COS",    "name": "Change of Service", "hidden": false }
    ],
    "levels": ["Single", "Double", "Triple"],
    "rates": { "NC|Single": 4500, "NC|Double": 6000, "NC|Triple": 8500 },   // cents
    "charges": [
      { "id": "c1", "name": "Company fee", "kind": "percent", "amount": 10 },
      { "id": "c2", "name": "Insurance",   "kind": "weekly",  "amount": 5000 }
    ]
  },
  "jobs": [
    {
      "id": "j_…",            // internal id
      "date": "2026-10-15",   // local date, YYYY-MM-DD
      "type": "NC",
      "level": "Triple",
      "jobId": "4471823",     // employer work-order number
      "address": "123 Main St",
      "price": 8500,          // cents, snapshot
      "notes": "",
      "createdAt": "2026-10-15T14:02:11Z"
    }
  ],
  "expenses": [
    { "id": "e_…", "date": "2026-10-15", "kind": "fuel",       "amount": 4200, "gallons": 12.4, "note": "" },
    { "id": "e_…", "date": "2026-10-14", "kind": "chargeback", "amount": 2500, "note": "Repeat visit #4471001" }
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
| M1 | Home week view, manual add / edit / delete job, price list, local storage. |
| M2 | Fuel & chargeback expenses, recurring charges, net calculation. |
| M3 | Statistics screen, CSV / JSON export & import. |
| M4 | Scan (OCR) auto-fill. |
| M5 | Offline / installable (PWA), GitHub Pages deploy. |

---

## 9. Open questions

1. Are the defaults right — **NC = New Connect, RC = Reconnect, Rescue = trouble call, COS = Change of Service**? Any other job types?
2. Does every job type have Single / Double / Triple, or does e.g. Rescue have one flat price?
3. What charges does your employer take — % of pay, fixed per week, per job, equipment chargebacks?
4. Should weekly charges apply every week, or only weeks you worked?
5. What does the work-order screen you would scan look like (which app / fields)? A sample photo would help tune the OCR.
6. Do you need extra pay items (bonuses, extra drops, extra outlets, mileage)?
