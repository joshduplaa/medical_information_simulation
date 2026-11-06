# Decisions

Each entry gives the decision, why, and what it costs. They're in roughly the order I made them. The audit behind
them is in [PLAN.md](PLAN.md).

## Scope and cleanup

**D1. Keep the existing stack (React + ASP.NET Core) instead of rewriting.**
The team had already picked .NET 8 + EF Core + Identity and React + MUI, and both halves had a usable skeleton.
Keeping them means the project is still recognizably the team's, and I can explain every layer.
*Cost:* inherited names like `ScrumDumpsterMolecularDiagnostic` and `AdminQCLot` stay, because renaming them would
churn every namespace and migration for no user benefit.

**D2. Delete the snapshots (MIS/, MIS.zip, api_two/, the deprecated clients, the template API) instead of keeping
them "for reference".** They were copies of the same code at different ages, plus a 75 MB zip. Anyone reading the
repo couldn't tell which one was live. Git history keeps every one of them. I ported the pieces worth keeping
(lot delete, analyte update mapping) and recorded the rest in PLAN.md.

**D3. Take quizzes, case studies, patient reports and reference files out of the navigation.** None of them had a
backend. They were static or mock pages. The brief said every route must work with persisted data or be removed,
and finishing the QC loop properly was worth more than four half-built features. They are listed as known gaps.

**D4. Rewrite the client pages on top of one typed API layer, instead of patching the old pages.** The old pages:
- logged users in by downloading every user and comparing bcrypt hashes in the browser;
- kept "reports" in localStorage;
- plotted hard-coded sample data;
- had 107 TypeScript errors.

Fixing them would have meant rewriting most lines anyway. I kept the team's visual identity (logo, colors, MUI) and
the domain vocabulary (lots, analytes, QC order).

## Data and running locally

**D5. Selectable database provider: SQL Server (Docker) for development, SQLite for tests and CI.**
SQL Server matches what the team used, and `docker compose up` gives everyone the same database. SQLite makes the
API tests and E2E fast and dependency-free on CI runners.
*Cost:* two providers can behave differently, for example in date handling (see D14). SQL Server applies real
migrations. SQLite uses `EnsureCreated`, because SQL Server migrations contain provider-specific SQL. CI runs
`has-pending-model-changes`, so a model change without a migration fails the build.

**D6. Fresh `InitialCreate` migrations.** The old migrations targeted a schema that stored plaintext passwords and
seeded with `DateTime.Now`, which made every migration diff dirty. No real data existed to preserve.

**D7. Seed in code (`DbSeeder`), only when the database is empty, only when `Seed:Enabled` (Development by default).**
`HasData` seeds become part of the migrations and can't create Identity users with hashed passwords. A code seeder
can, and it can generate realistic QC history from a fixed random seed. The seed plants a 2-2s and a 1-3s so the
charts have something to teach.

**D8. Secrets go in `dotnet user-secrets`, created by `scripts/dev-setup.sh`. There is no shared dev key.**
The committed JWT key is public forever, so the fix has to make it impossible to fall back to a known key. The API
fails at startup if `Jwt:Key` is missing or shorter than 32 bytes. Example configs (`.env.example`, empty values in
`appsettings.json`) show the shape without values.

## Security

**D9. Deny by default.** A fallback authorization policy requires an authenticated user on every endpoint. Only
login, register and health are `[AllowAnonymous]`. A new endpoint that someone forgets to annotate is protected
rather than public.

**D10. Public sign-up always creates a student.** The old `Register` accepted a `Roles` array, so anyone could make
themselves faculty. Faculty are created by faculty (`RegisterFaculty`).

**D11. Keep the Identity role name `Admin` for faculty, behind a `Roles.Faculty` constant.** The domain tables are
already `Admin`/`AdminQCLot`, and renaming the role would mean a data migration for no visible gain. The UI says
"Faculty" everywhere.

**D12. Another student's run returns 404, not 403.** A 403 confirms the run exists. Students have no reason to know
other runs' IDs.

**D13. The JWT carries the profile ID (`mis:profile_id`), the role and a display name.** Controllers can then check
ownership without another lookup, and the client can render the header without an extra request. Tokens last 8 hours
(one lab session). There are no refresh tokens, which is acceptable for a teaching app.

**D13a. Rate-limit sign-in and sign-up per client IP, in addition to the per-account lockout.** Lockout stops someone
guessing one account's password, but not one client trying a password against many accounts, or mass registration.
ASP.NET Core's built-in fixed-window limiter (20 per minute by default, configurable) returns 429 ProblemDetails
with `Retry-After`.
*Cost:* behind a proxy every client shares the proxy's IP, so forwarded headers must be configured before
deploying.

## Workflow and QC

**D14. All timestamps are UTC end to end, and EF tags every DateTime as UTC on read.**
I found this through the screenshots: a run created at 17:08 PST showed as 9:08 AM the next day. The database
returned `Kind=Unspecified`, the JSON had no `Z`, the browser assumed local time, and every draft save pushed the
run date forward by 8 hours. The fix is in one place, in the DbContext conventions, and a regression test fails
without it. Lot open and expiration dates are calendar dates, so the client formats them in UTC.

**D15. The run workflow is a small pure state machine (`ReportWorkflow`) with unit tests.**
`InProgress → Submitted → Graded`, with `Submitted → Returned → Submitted`. Illegal transitions return 409
ProblemDetails. Keeping it pure (no EF, time injected) makes each rule a one-line test.

**D16. Westgard rules are evaluated in the client only (TypeScript).**
The API stores results. The client computes z-scores and rules for display (live while typing, in the results table
and on the chart). The rules are pure functions with unit tests.
*Why not the server:* for this teaching workflow a rejection informs the student and the grader. It doesn't block
anything, so duplicating the logic in C# would be cost without behavior.
*Cost:* a different client could display different verdicts. If rules ever gate submission, they must move to the
API.

**D17. Each run is evaluated against the earlier runs only, and the table and the chart use the same evaluation.**
That's how a tech applies the rules at the bench: you can't use tomorrow's result. At first the results table used
single-value rules (1-2s and 1-3s) while the chart used the multirules, so the same run said "warning" in one place
and "reject 2-2s" in another. Both now use `evaluateInContext`.

**D18. R-4s is applied across consecutive runs.** Classically R-4s is a within-run rule across two control levels.
MIS records one level per run, so the closest faithful reading is across consecutive runs of the same material.
This is documented in the code and the README.

**D19. Lots with runs can't be deleted (409), and their analytes can't be removed. Deactivate them instead.**
Deleting would orphan graded work. Editing mean and SD is allowed, because correcting a target is a real lab
action, but it re-scores history. That's a known simplification: real labs version their targets. As a safeguard, the editor
names each changed mean or SD on a lot with runs and requires an explicit acknowledgment before saving. It suggests a
new lot when history should be preserved.

## Demo and deployment

**D20. The demo runs entirely in the browser, behind the same `MisApi` interface.**
The brief said no paid resources, and hosting the API and SQL Server costs money. A static Firebase Hosting site is
free and already existed. `createDemoApi` implements the same interface over deterministic synthetic data in
localStorage, applying the same transition rules and role checks. A demo banner says that nothing is sent to a
server.
*Cost:* the demo duplicates server rules in TypeScript. The demo E2E spec and the shared interface keep the two
honest.

**D21. Deployed the demo to the existing `scrumdumpstersmis` Firebase project.** The Firebase CLI was already
logged in with access, which the brief allowed. The deploy was verified by running the demo Playwright spec against
the live URL.

**D21a. A Compose profile runs the whole stack with one command.** `docker compose --profile full up` builds the API
image (SDK build stage, then the non-root `aspnet` runtime) and the client (Vite build served by nginx with an SPA
fallback). Reviewers and teammates need only Docker. CI builds and boots it and smoke-tests login and a protected
endpoint, so the Dockerfiles can't silently rot. The API runs with `ASPNETCORE_ENVIRONMENT=Development` in this
profile, so it seeds the synthetic data. It is a local profile, not a production deployment.

**D22. CI has no deploy step and no secrets.** The API tests use a fixed test-only key set in the test factory. The
E2E API script generates a throwaway key per run. Deploys stay a deliberate human action.

## Portfolio

**D23. The portfolio change went to a branch and a PR, and was deployed from that branch. It was not merged into the
portfolio's `main`.** The brief said not to change `main`. That rule was written for MIS, but its scope was
ambiguous, and recent portfolio changes all went through PRs. The PR is the reversible choice.
*Cost:* the live site is ahead of `main` until PR #9 is merged. A deploy from `main` before then would revert the MIS
update. HANDOFF flags this as the first next step.
