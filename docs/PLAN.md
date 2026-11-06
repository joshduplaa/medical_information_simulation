# Plan — finishing Medical Information Simulation (MIS)

Written 16:43 PST, Nov 5 2026, after the audit. This is the plan I started from. `docs/WORKLOG.md`
records what actually happened.

## Product name
The GitHub repo description says **"Medical Information Simulation website for the TTU HSC"** and the repo is
named `medical_information_simulation`, forked from `yuh137/medical_information_simulation`. The client
`<title>` says "Molecular Diagnostic LIS". The portfolio says "Molecular Information Simulations
laboratory", which is wrong. I use **Medical Information Simulation (MIS)**, described as a
laboratory-information-system (LIS) simulation for clinical lab science students. It is not for clinical use.

## Audit findings (verified, not assumed)

### Repository layout on `origin/main` (1f5c473, 794 tracked files)
| Path | What it is | Verdict |
|---|---|---|
| `clientReactApp-SD/` | Vite + React 18 + TS + MUI client (ScrumDumpsters team, Nov 2024) | **Keep. Core client** |
| `api/ScrumDumpsterMolecularDiagnostic/` | .NET 8 Web API, EF Core SQL Server, Identity + JWT, repository pattern | **Keep. Core API** |
| `api_two/Medical-Information.API/` | Older copy of the same API under the original namespace (Taylor Smith, 2024-11-19) | Port the useful pieces, then remove |
| `MIS/` (214 files), `MIS.zip` (75 MB) | Older snapshot of the client, plus a zip of it | Remove |
| `client_Huy_Deprecated/`, `deprecated_HUY_api/` | Predecessor team's CRA/Tailwind client and API, already labeled deprecated | Remove (stays in history) |
| `PuttinTheDinIt/` | `dotnet new webapi` weather template | Remove |
| `readme` ("Hello"), root `package-lock.json` (empty) | Placeholders | Replace with a real README |
| `**/bin`, `**/obj`, `.firebase/` cache | Tracked build output | Untrack and ignore |
| `*copy.tsx` (2 files) | Unused duplicates | Remove |

### api vs api_two (diffed with whitespace ignored)
`api/` is a renamed copy of `api_two/` with role checks added on `AdminsController`. `api_two` additionally has:
- `DELETE AdminQCLots/DeleteQCLot/{id}` → **port it**
- `ExpInRange` on Analyte → not needed. I compute the in-range flag from mean and SD instead of storing it.
- Analyte mapping inside `UpdateQCLot` → **port the behavior**
- Plaintext `Password` columns on Student/Admin → **do not port**. ASP.NET Identity already stores hashes.
- `POST Students` and `POST Admins` without auth → **do not port**. That is privilege escalation.
- `Services/ExpirationService.cs` → **an empty stub**. The try block is literally `//var`. Nothing to port.
- 17 migrations → they target an older schema (`Password` columns, `ExpInRange`) and their seed data uses
  `DateTime.Now`. They are not reusable. I will create a fresh `InitialCreate` for the current model.

### Older work in history
- Commit `b217099` (HUY, Feb 2025) has a `StudentReportController` and repository. I use its design as the
  reference for the new reports endpoints.
- The team branches (`QCPanel_MANGO`, `DNAlytics_Molecular`, `CZH_Heme/Coag`, `HelloWorld!_Microbiology`,
  `Thefour_Urinalysis`) each contain `ChemistryLeveyJennings.tsx`. It is a d3 chart with mean ±1/2/3 SD lines,
  reads IndexedDB, and depends on a different CRA client. I port the **concept** (SD bands, run table,
  accept/reject with comment) to Recharts, which the core client already depends on. I do not copy the code,
  because it depends on IndexedDB stores that won't exist.
- PDF printing on those branches uses jsPDF + html2canvas on the client. `PDFGeneratorService` on `b217099` is
  fully commented out. If time allows I'll add a print stylesheet instead of new PDF dependencies.

### Problems confirmed in the core app
1. **Login runs in the browser.** `SignIn.tsx` GETs `/api/students` and `/api/admins` (all users), then
   bcrypt-compares the typed password against each record client-side. The API has a working Identity-based
   `POST /api/Auth/LoginByUsername` that the client never uses. The current `api/` DTOs have no password
   field, so login cannot work against the current API at all.
2. **Registration lets the caller choose roles**, including `Admin`.
3. No `[Authorize]` on QC lots, analytes, students, or images. `AdminsController` has role checks.
4. JWT signing key committed in `appsettings.json`.
5. Windows `Trusted_Connection` SQL strings. API port 5223 (launchSettings), client calls `:5029`, CORS allows
   `:3000`, `.env` says `VITE_API_URL=http://localhost:3000`. These are four different answers.
6. No migrations in `api/`, and `HasData` seeds use `DateTime.Now`, so every migration would churn.
7. **No backend for submissions or grades.** There is no StudentReport controller or repository in `api/`.
   Client "reports" live in `localStorage`. The review page plots hard-coded `sampleChartData`. "Download report"
   writes a stub JSON file. The gradebook is a static table followed by the text "Self explanitory".
8. `ImagesController` validation is inverted: it *rejects* .jpg/.png.
9. Template leftovers: `top100Films`, blog components, `APIT.tsx`, an empty `AllOrderEntries.tsx`, duplicate
   `DrawerToggle_black`. 107 TypeScript errors (`tsc --noEmit`). The build passes only because Vite doesn't
   type-check.
10. Dependencies that don't belong in a browser bundle: `express`, `nodemailer`, `npm`, `-`, `resend`,
    `cross-spawn`, `node-forge`, `npm-check-updates`, `@react-email/*`, `bcryptjs-react`.
11. No tests, no CI.

## Target architecture (kept, not replaced)
```
React (Vite, TS, MUI)  ──HTTP/JSON + Bearer JWT──►  ASP.NET Core 8 Web API
  src/api/ (one typed client)                         Controllers → Repositories → EF Core
  AuthContext + role-guarded routes                   Identity (users/roles) + JWT
  Demo mode: same interface, in-browser store         SQL Server (Docker) │ SQLite (tests/CI/fallback)
```

## Domain model for the core loop
- **AdminQCLot** (QC lot: name, lot #, department, open/expiration dates, active) has many **Analyte** rows
  (name, acronym, unit, mean, SD, min/max acceptable range).
- **StudentReport** (one QC *run*). It belongs to a Student and a lot. Status moves
  `InProgress → Submitted → Graded`, and a faculty member can return a Submitted run to `Returned` so the
  student fixes and resubmits it. The run also stores the student's comment, the grade (0–100), faculty
  feedback, the reviewer, and the review timestamp.
- **AnalyteInput** (one result value for one analyte in one run).
- Standard QC definitions: z = (x − mean)/SD. Westgard rules **1-2s** (warning), **1-3s**, **2-2s**,
  **R-4s**, **4-1s**, and **10x** (rejections) are evaluated across a student's chronological runs for a
  lot and analyte. The Levey-Jennings chart shows mean and ±1/2/3 SD lines.

## Milestones and order of work
1. **Audit and plan.** This document.
2. **Clean up.** Remove the redundant folders, bin/obj, the zip, and the copies. Write a root `.gitignore`.
3. **Run locally.** Add `docker-compose.yml` (SQL Server 2022). Select the provider by config
   (`Database:Provider` = `SqlServer` | `Sqlite`). Move secrets to user-secrets or environment variables, with a
   `scripts/dev-setup.sh` that generates them. Create a fresh `InitialCreate` migration per context. Add an
   idempotent synthetic seeder that only runs in Development. Fix ports: API on 5029, client on 5173, CORS from
   config. Centralize the client API base URL in `VITE_API_BASE_URL`.
4. **Finish the workflow.**
   - API: a reports controller (order, save results, submit, review queue, grade or return), a gradebook
     endpoint, Levey-Jennings history, and lot delete/deactivate.
   - Client: a typed API layer, an auth context, and role-guarded pages (Lots CRUD, Order QC, Enter results,
     My runs, Run detail with LJ charts, Review queue, Grade, Gradebook), each with loading, empty, and error
     states.
5. **Secure it.** Role policies on every controller, ownership checks on reports, public register limited to
   the Student role, and a new dev key outside git.
6. **Test it.** xUnit + `WebApplicationFactory` + SQLite in-memory API tests. Vitest unit tests (Westgard,
   API layer, components). A Playwright E2E test of the full loop against the real API. GitHub Actions CI
   (build, lint, tests, E2E) with no secrets and no deploy.
7. **Make it presentable.** Consistent layout, a README with screenshots and a diagram, a browser-only demo
   mode (`VITE_DEMO_MODE=true`) deployed to the existing Firebase Hosting site if the CLI has access.
8. **Backlog** in WORKLOG.
9. **Portfolio** update at 20:53 at the latest.

## Explicitly out of scope / removed from navigation unless time allows
Quizzes, case studies, patient reports, and reference files have no backend. They are template or mock
pages, so they come out of navigation. They stay in history, and HANDOFF.md lists them as gaps.
