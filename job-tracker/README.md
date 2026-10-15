# Job Tracker

Browser app for an internet field tech who is paid per job: log jobs, see weekly pay
(weeks start Sunday), deductions, fuel and net, with statistics.

Full spec: [docs/SPEC.md](docs/SPEC.md).

## Features
- **This week** screen: earned, jobs completed, deducted, fuel, net; ‹ › to browse weeks.
- **＋ Add**: job type (NC / RC / Rescue / COS / TC) → Single / Double / Triple → job ID, address. Price fills in from Settings. Tap any job to edit or delete it.
- **📷 Scan**: photo or screenshot of the work app — the job card, or the End of Day Summary (adds several jobs at once). Text is read on the phone; nothing is uploaded.
- **🚚 Fuel**: fuel expenses and one-time deductions (equipment charges).
- **📊 Stats**: this/last week, month, year, all time; by code; net per week chart.
- **⚙ Settings**: price for each code, default charges, job types and scan words, backup / import / CSV export.

Data is stored in the browser on your phone. Use **Settings → Export backup** regularly.

## Run it
No build step — it is plain HTML/CSS/JS.

- **Locally:** `python3 -m http.server` in this folder, open http://localhost:8000.
- **On your phone (recommended):** host it with GitHub Pages (free, HTTPS — needed for camera and offline mode):
  1. GitHub repo → **Settings → Pages** → Source: *Deploy from a branch* → pick the branch and `/ (root)` → Save.
  2. Open `https://<username>.github.io/<repo>/job-tracker/` on the phone.
  3. Browser menu → **Add to Home screen**. It then opens like an app and works offline.

The first scan downloads the text reader (~10 MB); after that it is cached.
