# MIS API

ASP.NET Core 8 Web API for Medical Information Simulation. See the [root README](../README.md) for setup.

## Projects

- `ScrumDumpsterMolecularDiagnostic/`: the API. The project name comes from the original team ("Scrum Dumpsters")
  and was kept so the migration history and namespaces stay intact.
- `ScrumDumpsterMolecularDiagnostic.Tests/`: xUnit tests. They host the real app (`WebApplicationFactory`) over
  in-memory SQLite, plus unit tests for the run workflow.

## Configuration

| Key | Where it comes from | Notes |
| --- | --- | --- |
| `Jwt:Key` | `dotnet user-secrets` (dev), environment variable `Jwt__Key` (elsewhere) | Required, at least 32 bytes. The API exits at startup without it. |
| `ConnectionStrings:MedicalInformationConnectionString` / `...AuthConnectionString` | user-secrets / env | App data and Identity are separate databases. |
| `Database:Provider` | user-secrets / env | `SqlServer` (applies migrations on startup) or `Sqlite` (creates the schema; used by tests/CI). |
| `Cors:AllowedOrigins` | `appsettings.Development.json` | The Vite dev (5173) and preview (4173) origins. |
| `Seed:Enabled` | defaults to true in Development | Seeds synthetic lots, students and runs into an empty database. |

## Endpoints (all under `/api`)

Authorization is deny-by-default. Every endpoint needs a valid JWT unless it is marked anonymous.

| Area | Endpoints | Roles |
| --- | --- | --- |
| Health | `GET /health` | anonymous |
| Auth | `POST /Auth/Register` (always creates a student), `POST /Auth/Login`, `GET /Auth/Me`, `POST /Auth/RegisterFaculty` | anonymous / any / faculty |
| QC lots | `GET /AdminQCLots` (students see active lots only), `GET/PUT/DELETE /AdminQCLots/{id}`, `POST /AdminQCLots` | read: any; write: faculty |
| Runs | `GET /Reports`, `GET /Reports/{id}`, `POST /Reports`, `PUT /Reports/{id}/results`, `POST /Reports/{id}/submit`, `DELETE /Reports/{id}` | student (own runs); faculty can read all |
| Review | `POST /Reports/{id}/grade`, `POST /Reports/{id}/return` | faculty |
| Charts | `GET /Reports/{id}/levey-jennings` | owner student or faculty |

Workflow violations, such as submitting an incomplete run or grading a draft, return `409` with a ProblemDetails
body. A student requesting another student's run gets `404`.

## Migrations

```bash
cd api && dotnet tool restore
dotnet ef migrations add <Name> --project ScrumDumpsterMolecularDiagnostic --context MedicalInformationDbContext --output-dir Migrations/App
dotnet ef migrations add <Name> --project ScrumDumpsterMolecularDiagnostic --context MedicalInformationAuthDbContext --output-dir Migrations/Auth
```

CI fails if the model has changes without a migration (`dotnet ef migrations has-pending-model-changes`).
