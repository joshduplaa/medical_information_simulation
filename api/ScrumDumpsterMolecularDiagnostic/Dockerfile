# MIS API image (used by `docker compose --profile full up`). Build context: this folder.
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ScrumDumpsterMolecularDiagnostic.csproj ./
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .
# Uploaded images are written here; the app runs as the image's non-root "app" user.
RUN mkdir -p /app/Images && chown app /app/Images
USER app
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "ScrumDumpsterMolecularDiagnostic.dll"]
