#!/usr/bin/env bash
# Starts the API for Playwright: fresh SQLite database, synthetic seed, throwaway JWT key, port 5030.
# Environment variables override appsettings and user-secrets, so this never touches your dev database.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA="${E2E_DATA_DIR:-$ROOT/api/ScrumDumpsterMolecularDiagnostic/bin/e2e-data}"
mkdir -p "$DATA"
find "$DATA" -maxdepth 1 -name 'e2e-*.db*' -type f -delete
export ASPNETCORE_ENVIRONMENT=Development
export ASPNETCORE_URLS=http://localhost:5030
export Database__Provider=Sqlite
export ConnectionStrings__MedicalInformationConnectionString="Data Source=$DATA/e2e-mis.db"
export ConnectionStrings__MedicalInformationAuthConnectionString="Data Source=$DATA/e2e-mis-auth.db"
export RateLimit__AuthPermitsPerMinute=100000  # E2E signs in many times from one address
export Jwt__Key="e2e-only-signing-key-$(date +%s)-0123456789abcdef0123456789"
export Seed__Enabled=true
export Cors__AllowedOrigins__0=http://localhost:5174
exec dotnet run --project "$ROOT/api/ScrumDumpsterMolecularDiagnostic" --no-launch-profile
