# Student Portal

A single-page academic portal where a student signs in with their **Registration Number + Date of Birth** to view their profile and semester results — with SGPA/CGPA, a downloadable PDF, and an offline mode backed by IndexedDB.

## Project Overview

- One HTML file, one CSS file, one JS file. No build step, no framework, no npm install.
- Works from `file://` during development and from GitHub Pages in production (only relative paths are used).
- Backed by Supabase (PostgreSQL) for live data; falls back to a local IndexedDB cache when offline.

## Features

- Login with Registration Number + Date of Birth
- Student profile (department, batch, contact, parent/guardian info)
- Semester selector, subject-wise marks (internal / external / total / grade / grade point)
- Tap or click a subject row for full details in a modal
- SGPA per semester, CGPA across all synchronized results
- PASS / FAIL status at both the semester and overall level
- Download the currently displayed semester as a PDF
- Refresh, logout
- Online / offline indicator, with cached data available offline
- Light and dark themes, keyboard accessible, respects reduced-motion

## Architecture

```
Browser (index.html + style.css + app.js)
        │
        ├── online  → Supabase (PostgreSQL, RLS-protected, anon key only)
        │                 └── cached into IndexedDB on every successful read
        │
        └── offline → IndexedDB (student, results, metadata stores)
```

`app.js` is organized top to bottom as: configuration → state → Supabase client → DOM references → toast → theme → navigation → authentication → session → IndexedDB → offline handling → student/result data fetchers → SGPA/CGPA → dashboard rendering → result table rendering → modal → PDF export → error handling → event listeners → initialization.

## Folder Structure

```
student-portal/
├── index.html
├── style.css
├── app.js
├── database.sql
└── README.md
```

## Supabase Setup

1. Create (or reuse) a Supabase project.
2. In the SQL editor, run `database.sql`. It uses `CREATE TABLE IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS` throughout, so it is safe to run against a project that already has student data — it will not drop or overwrite anything.
3. Copy your project URL and **publishable (anon) key** — Settings → API — into the `CONFIG` object at the top of `app.js`. The URL and key already present in this project point to the demo project used while building this portal; replace them with your own.

## Database Setup

Tables: `students` and `results`, related by `results.regno → students.regno`. See `database.sql` for full column lists, indexes (`students(regno)`, `students(dob)`, `results(regno)`, `results(regno, semester)`), and a small demo dataset clearly marked `DEVELOPMENT / DEMO DATA ONLY`.

`dob` is a real `DATE` column — the login form's `<input type="date">` already emits `YYYY-MM-DD`, which matches Postgres directly, so no date reformatting happens before the query. Register numbers are always treated as strings (`22MCA001`, `CS-001`, etc.), never coerced to a JS number.

## Row Level Security (RLS) — read this before going live

This portal authenticates with Registration Number + Date of Birth from a **static, unauthenticated frontend**. That is a convenience check, not real authentication — anyone who knows or guesses a valid pair can pass the login screen, and a static site cannot keep a secret (the anon key is public by design).

`database.sql` ships with `SELECT`-only RLS policies for the `anon` role on both tables, with no insert/update/delete access, so the demo works immediately. This means the frontend's own filtering (always `.eq("regno", ...)`) is what keeps one student from seeing another's data in the app itself — but a technically savvy user with the anon key could query every row directly. **Do not put real student PII behind this configuration.**

For real deployments, prefer one of:

1. **Best:** Supabase Auth (e.g. magic link to the student's college email), so RLS policies can key off `auth.uid()` and each student can only ever read their own rows.
2. **Middle ground:** a Postgres `SECURITY DEFINER` function or a Supabase Edge Function that accepts `regno` + `dob` as parameters and returns only that student's rows; revoke direct table `SELECT` from `anon`.
3. **Demo only:** the open `SELECT` policies shipped here.

## Configuration

All configuration lives at the top of `app.js`:

```js
const CONFIG = {
  supabaseUrl: "...",
  supabasePublishableKey: "...",
  studentsTable: "students",
  resultsTable: "results",
  ...
};
```

Only the publishable (anon) key belongs here. **Never** put a `service_role` key or a Postgres connection string (`postgresql://postgres:[PASSWORD]@...`) in `index.html`, `style.css`, or `app.js` — anything shipped to the browser is public.

## Local Development

No build tools required. Open `index.html` directly, or serve the folder with VS Code's Live Server extension (recommended, since some browsers restrict `fetch`/IndexedDB on `file://`).

## GitHub Pages Deployment

1. Push the `student-portal/` folder contents to a repository.
2. Enable GitHub Pages for that repo (Settings → Pages).
3. Every asset reference in `index.html` is relative (`style.css`, `app.js`, not `/style.css`), so the site works correctly whether it's served from `https://username.github.io/` or `https://username.github.io/repository-name/`.

## Offline Mode

On a successful online login, the student's profile and each semester's results are cached into IndexedDB (`StudentPortalOffline` database, `student` / `results` / `metadata` stores) along with a "last synced" timestamp. If the connection drops:

- The header status pill switches to **Offline**.
- Dashboard and results continue to display the last synchronized data for that student on that device.
- PDF export still works, generated from the cached results.
- Requesting a semester that was never synchronized on this device shows a clear "hasn't been synchronized on this device" message rather than an empty or broken screen.

Offline login only succeeds if that registration number + date of birth combination was already cached on the device from a prior online login — it never invents access to a student who hasn't synced there.

## PDF Generation

Uses `jsPDF` and `html2canvas`, loaded from CDN only when the student first clicks **Download PDF** (not on page load). The PDF includes student details, the full subject table for the selected semester, SGPA, CGPA, and status.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| "The portal isn't configured correctly" | `supabase-js` failed to load, or `CONFIG.supabaseUrl` / key is wrong |
| "Registration number or date of birth is incorrect" | No matching row in `students`, or `dob` format mismatch |
| Results show for the wrong semester | Check that `semester` is stored as `INTEGER`, not text |
| PDF button does nothing | Check console — CDN scripts may be blocked by an ad blocker or offline |
| Data missing after refresh | Confirm the browser allows IndexedDB (not in strict private mode) |

## Security Limitations

- Regno + DOB login is a convenience gate, not authentication — see the RLS section above.
- The anon key is public; RLS policies, not frontend code, are the real access boundary.
- No write access is granted to the anon role anywhere in `database.sql`.

## Updating the Database

Re-run `database.sql` any time — every statement is idempotent. For genuinely destructive changes (only ever on a scratch/dev project), use the `DANGER — DEVELOPMENT ONLY` section at the bottom of the file, which is commented out by default.

Supabase CLI (optional, for migrations/administration only — never required for the site itself to run):

```bash
supabase login
supabase init
supabase link --project-ref yydcbfrrsicqchgumhjr
```

## Clearing Offline Cache

Logging out clears the session but keeps the IndexedDB cache so the student can still view their last synced data offline later. To fully clear cached data for a device, open DevTools → Application → IndexedDB → `StudentPortalOffline` → delete the database.
