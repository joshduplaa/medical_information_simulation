# Handoff: `finish-mis`

The state of the branch for whoever picks it up next (most likely Joshua after the 5-hour session). This is kept
current. The work log is [WORKLOG.md](WORKLOG.md).

## Where things are

- **Branch:** `finish-mis` on `joshduplaa/medical_information_simulation`, pushed. `main` is untouched. Nothing was
  merged, and no history was rewritten.
- **CI:** GitHub Actions `CI` workflow on every push. It runs the API build and tests, client typecheck, lint, unit
  tests and both builds, and the Playwright E2E suite. Older runs show as *cancelled* because the workflow uses a
  concurrency group with cancel-in-progress.
- **Live demo:** https://scrumdumpstersmis.web.app, a browser-only demo build on the existing `scrumdumpstersmis`
  Firebase project. It was verified by running `e2e/demo-mode.spec.ts` against the live URL.

## Verified working (and how)

| Capability | Evidence |
| --- | --- |
| Faculty create/edit/deactivate/delete QC lots and analytes, with 409 when a lot is in use | API tests (`WorkflowTests`), E2E `core-workflow.spec.ts` |
| Students order QC on active, unexpired lots and save drafts | API tests, E2E |
| Live z-scores and Westgard rules; LJ charts with an accessible data table | Vitest `westgard.test.ts`, E2E, screenshots in `docs/screenshots` |
| Submit → grade or return → resubmit | `ReportWorkflowTests`, `WorkflowTests`, demo parity tests, E2E |
| Gradebook for both roles | E2E (the student sees the new grade and feedback) |
| Role-based auth, deny-by-default, ownership (404), sign-up can't claim faculty | `SecurityTests`, E2E role-guard test, curl smoke tests |
| Faculty create faculty accounts | demo unit test, E2E against the real API |
| WCAG 2.1 AA automated scan on every page; keyboard-only sign-in, skip link, nav order | `e2e/a11y.spec.ts` |
| No page-level horizontal scroll at 375 px | scripted check of all 16 pages (WORKLOG 17:40) |
| Runs on SQL Server in Docker with migrations, or on SQLite | local dev used SQL Server; tests and CI use SQLite |
| Whole stack with one command (`docker compose --profile full up`) | Playwright walkthrough against :8080; CI `docker` job |
| Per-IP rate limit on sign-in/sign-up (429) | `SecurityTests`, curl against the dev API |
| CSP on the hosted demo | demo and a11y specs pass on the live site with no CSP violations |

## How to resume

```bash
cd ~/professional/medical_information_simulation && git switch finish-mis && git pull
scripts/dev-setup.sh && docker compose up -d --wait
(cd api/ScrumDumpsterMolecularDiagnostic && dotnet run --launch-profile http)   # :5029
(cd client && npm ci && npm run dev)                                            # :5173
```

Or, with only Docker: `scripts/dev-setup.sh --docker-only && docker compose --profile full up -d --build --wait`
(client at http://localhost:8080).

To wipe the dev database and reseed: `docker compose down -v && docker compose up -d --wait`, then restart the API.
.NET was installed at user level to `~/.dotnet` (not on the system PATH). Run `export PATH=$HOME/.dotnet:$PATH`
before `dotnet` or `npm run e2e`.

## Must know

- **The old JWT signing key is in git history** (the original `appsettings.json`). Treat it as public. Never use
  it in any environment. The current code has no key in tracked files and refuses to start without a new one.
- The seed data is synthetic (`@mis.example.edu`, invented names). Keep it that way: no real student or patient
  data, ever.
- Faculty is the Identity role named `Admin` (`Roles.Faculty`). See DECISIONS D11.

## Known gaps / next steps

The full list is in README → *Known gaps* and the WORKLOG backlog. Highlights:

1. Quizzes, case studies, patient reports and reference files were removed from the navigation (mock-only). Build
   them on the same pattern (API endpoint, `MisApi` method, demo implementation, page) if they're wanted.
2. Westgard evaluation is client-only and informational. If a rejection should block submission, move the rules
   to the API and share the test vectors.
3. Editing a lot's mean or SD re-scores its history. Real labs version targets.
4. There is no password reset or email.
5. To host the real API you'd need a server and database (not done: no paid resources). The client only needs
   `VITE_API_BASE_URL` set at build time.
6. Optionally open a PR `finish-mis → main` on the fork for review. It was deliberately not done in this session.
