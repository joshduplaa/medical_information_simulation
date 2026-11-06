using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace ScrumDumpsterMolecularDiagnostic.Data
{
    // Used only by `dotnet ef migrations add`. Migrations are generated for SQL Server; the connection
    // string is a placeholder because generating a migration never connects to a database.
    internal static class DesignTime
    {
        public const string Placeholder = "Server=localhost;Database=design_time_only;User Id=sa;Password=unused;TrustServerCertificate=True";
    }

    public class MedicalInformationDbContextFactory : IDesignTimeDbContextFactory<MedicalInformationDbContext>
    {
        public MedicalInformationDbContext CreateDbContext(string[] args) =>
            new(new DbContextOptionsBuilder<MedicalInformationDbContext>().UseSqlServer(DesignTime.Placeholder).Options);
    }

    public class MedicalInformationAuthDbContextFactory : IDesignTimeDbContextFactory<MedicalInformationAuthDbContext>
    {
        public MedicalInformationAuthDbContext CreateDbContext(string[] args) =>
            new(new DbContextOptionsBuilder<MedicalInformationAuthDbContext>().UseSqlServer(DesignTime.Placeholder).Options);
    }
}
