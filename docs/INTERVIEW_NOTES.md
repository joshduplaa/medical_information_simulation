# Interview notes: MIS

Notes for talking about this project honestly and in depth.

## The 30-second version

MIS is a web app for teaching lab quality control. Faculty define QC lots with target means and SDs. Students run
QC, enter results, and see Levey-Jennings charts with Westgard rule checks. Faculty grade or return each run, and
grades go to a gradebook. It began as a team capstone for Texas Tech HSC. I later finished the core workflow
end to end:
- server-side auth with roles;
- a real submission and grading workflow;
- tests at three levels, plus CI;
- a browser-only demo deployed to Firebase.

## Who did what (be precise about this)

| Work | Who |
| --- | --- |
| Original concept, first client and API, QC builder, AdminQCLot API, image upload | Huy (yuh137) and the earlier team (2024) |
| Original Levey-Jennings chart (d3 + IndexedDB, on team branches) | Geethika |
| Create/edit QC with backend, sign-up/login against the DB, order page | Taylor Smith |
| Account page, password hashing, case studies | Jaden Haagen |
| Quizzes / report submission pages | Cristian Cuomo |
| `clientReactApp-SD` rebuild (started from my portfolio boilerplate), consolidated API from Huy's code, QC order and report flow, first Firebase deploy (Oct–Nov 2024) | **Me (Joshua)** |
| `finish-mis` (Nov 2026): audit, cleanup, API workflow and security, client rebuild on a typed API layer, tests, CI, demo mode, docs | **Me directing, with Claude (AI assistant) writing most of the code.** I set the brief, the constraints and the priorities. I own reviewing and understanding every change. |

If asked "did you write this yourself?": the 2024 work is mine and the team's, as above. The `finish-mis`
completion was done with an AI pair programmer working from my brief. Every decision has its reasoning recorded
in `docs/DECISIONS.md`, and I should be able to defend each one.

## Technical stories worth telling

**1. The login was happening in the browser.** The original sign-in downloaded every user record and compared bcrypt
hashes client-side. The API had a working Identity endpoint that nothing called. Registration also let the caller
pick their own role, including Admin.
- *Fix:* the server authenticates. Sign-up always creates a student. Faculty are created by faculty. Every endpoint
  is protected by default through a fallback policy. A student asking for another student's run gets 404, not 403,
  so they can't probe for IDs.
- *Talking point:* why deny-by-default beats remembering to add `[Authorize]` everywhere.

**2. The secret in git.** The JWT signing key was committed. Rotating it isn't enough when the old value is public
forever.
- *Fix:* the app refuses to start without a key of at least 32 bytes from user-secrets or the environment. A setup
  script generates a random key per developer. The old key must never be reused.
- *Talking point:* fail fast, and the difference between removing a secret and invalidating it.

**3. The timezone bug the screenshots found.** A run created at 5:08 PM showed as 9:08 AM the next day.
- SQL Server returned `DateTime` with `Kind=Unspecified`.
- System.Text.Json serialized it without a `Z`.
- The browser parsed it as local time.
- The date input then sent it back converted to UTC, so each save shifted the run 8 hours later.

*Fix:* one EF value-converter convention that tags all DateTimes as UTC on read, and a regression test that fails
without it. A related bug: lot expiration dates are calendar dates, so they're formatted in UTC, otherwise "Sep 22"
showed as "Sep 21" in Texas.
*Talking point:* instants vs calendar dates. Why the tests (SQLite) didn't catch it at first: they never round-tripped a
value through the browser.

**4. Two screens, two verdicts.** The results table checked each value alone (1-2s and 1-3s), while the chart applied
the multirules across runs. The same glucose result said "warning" in the table and "reject 2-2s" on the chart.
*Fix:* both use one function that evaluates a result together with the earlier runs (never later ones, the way a
tech applies the rules at the bench).
*Talking point:* a single source of truth for domain logic.

**5. Demo without a server.** Free static hosting can't run the .NET API. Every page talks to a `MisApi` interface,
and the demo build swaps in an in-browser implementation over deterministic synthetic data that follows the same
workflow rules. The same Playwright spec runs against both a local demo build and the deployed site.
*Talking point:* dependency inversion on the frontend, and how to keep a fake honest.

**6. Making the workflow testable.** The run lifecycle is a pure static class (`ReportWorkflow`) that takes the
current time as a parameter. Illegal transitions return a message that the controller turns into a 409. That makes
each rule a one-line unit test. The HTTP tests then cover the whole loop through `WebApplicationFactory` over
in-memory SQLite.

**7. Accessibility found real bugs.** An axe scan in E2E caught MUI's default warning orange and info blue failing
4.5:1 contrast, and nav links placed directly inside a `<ul>`. A scripted 375 px check found that the visually-hidden
table headers (`position: absolute`) escaped their scroll containers and made every table page 774 px wide. One
`position: relative` on the table container fixed every page.
*Talking point:* automated checks are a floor, not a ceiling. Axe can't read SVG text, so I checked the chart
labels' contrast by hand.

## QC domain cheat sheet

- **z-score** = (x − mean) / SD, using the lot's established mean and SD, not the student's own data.
- **Levey-Jennings chart:** results in run order against mean, ±1, ±2 and ±3 SD.
- **Westgard:**
  - `1-2s` warning; `1-3s` random error.
  - `2-2s` and `4-1s` systematic shift.
  - `R-4s` random error. Classically this is across two levels within one run; MIS applies it across consecutive
    runs because each run records one level.
  - `10x`: systematic shift (ten results on one side of the mean).
- **Not for clinical use.** All data is synthetic.

## Numbers you can quote (as of the `finish-mis` branch)

- 34 API tests, 41 client unit tests, 8 Playwright E2E tests (including an axe WCAG 2.1 AA scan of every page
  and a keyboard-only test). All run in GitHub Actions on every push, plus a job that builds and smoke-tests the
  Docker stack.
- Initial JS cut from 289 kB to 179 kB gzipped by lazy-loading the chart page.
- 0 TypeScript errors (down from 107) and a clean ESLint run.
- 794 tracked files on `main` → the cleanup removed snapshots, a 75 MB zip and tracked build output.

## Honest limitations to mention before they're asked

- No faculty-creation UI and no password reset.
- Rules are computed client-side only, and rejections don't block submission.
- Editing a lot's mean or SD re-scores its history. Real labs version their targets.
- The live demo is browser-only. The full stack runs locally with Docker.
