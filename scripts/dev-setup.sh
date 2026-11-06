#!/usr/bin/env bash
# One-time local setup for MIS. Safe to re-run: it never overwrites an existing .env or JWT key.
#   - creates .env with a random SQL Server SA password (git-ignored)
#   - stores a random JWT signing key and the connection strings in `dotnet user-secrets`
#     (kept in ~/.microsoft/usersecrets, outside the repository)
#   - creates client/.env.local pointing the client at the local API
# Usage: scripts/dev-setup.sh               # SQL Server in Docker (default)
#        scripts/dev-setup.sh --sqlite      # no Docker: SQLite files next to the API
#        scripts/dev-setup.sh --docker-only # only .env, for `docker compose --profile full` (no .NET needed)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API="$ROOT/api/ScrumDumpsterMolecularDiagnostic"
MODE="${1:-sqlserver}"


# Random alphanumeric string of length $1.
rand() { LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c "$1"; }

if [[ ! -f "$ROOT/.env" ]]; then
  # SQL Server requires upper, lower, digit and symbol.
  printf 'MSSQL_SA_PASSWORD=Mis-%s-9a\nMSSQL_PORT=1433\n' "$(rand 24)" > "$ROOT/.env"
  echo "Created .env with a random SA password"
fi
if ! grep -q '^JWT_KEY=' "$ROOT/.env"; then
  # Only used by `docker compose --profile full` (the API on the host reads its key from user-secrets).
  printf 'JWT_KEY=%s\n' "$(rand 64)" >> "$ROOT/.env"
  echo "Added a random JWT_KEY to .env for the Docker full-stack profile"
fi
if [[ "$MODE" == "--docker-only" ]]; then
  echo "Done. Next: docker compose --profile full up -d --build --wait  (client on http://localhost:8080)"
  exit 0
fi

command -v dotnet >/dev/null || { echo "dotnet (.NET 8 SDK) not found on PATH" >&2; exit 1; }
# shellcheck disable=SC1091
source "$ROOT/.env"

secret() { dotnet user-secrets --project "$API" set "$1" "$2" > /dev/null; }

if ! dotnet user-secrets --project "$API" list 2>/dev/null | grep -q '^Jwt:Key'; then
  secret "Jwt:Key" "$(rand 64)"
  echo "Generated a new local JWT signing key (user-secrets)"
fi

if [[ "$MODE" == "--sqlite" ]]; then
  secret "Database:Provider" "Sqlite"
  secret "ConnectionStrings:MedicalInformationConnectionString" "Data Source=mis.db"
  secret "ConnectionStrings:MedicalInformationAuthConnectionString" "Data Source=mis-auth.db"
  echo "Configured SQLite (api/ScrumDumpsterMolecularDiagnostic/mis.db)"
else
  secret "Database:Provider" "SqlServer"
  base="Server=127.0.0.1,${MSSQL_PORT:-1433};User Id=sa;Password=${MSSQL_SA_PASSWORD};TrustServerCertificate=True;Encrypt=False"
  secret "ConnectionStrings:MedicalInformationConnectionString" "$base;Database=Medical_Information"
  secret "ConnectionStrings:MedicalInformationAuthConnectionString" "$base;Database=Medical_Information_Auth"
  echo "Configured SQL Server on 127.0.0.1:${MSSQL_PORT:-1433} (start it with: docker compose up -d --wait db)"
fi

if [[ ! -f "$ROOT/client/.env.local" ]]; then
  printf 'VITE_API_BASE_URL=http://localhost:5029/api\n' > "$ROOT/client/.env.local"
  echo "Created client/.env.local"
fi
echo "Done. Next: see README.md -> Run locally."
