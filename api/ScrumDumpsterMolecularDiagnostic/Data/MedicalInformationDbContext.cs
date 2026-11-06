using ScrumDumpsterMolecularDiagnostic.Models.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace ScrumDumpsterMolecularDiagnostic.Data
{
    public class MedicalInformationDbContext : DbContext
    {
        public MedicalInformationDbContext(DbContextOptions<MedicalInformationDbContext> dbContextOptions) : base(dbContextOptions)
        {
        }

        public DbSet<Admin> Admins { get; set; }
        public DbSet<AdminQCLot> AdminQCLots { get; set; }
        public DbSet<Analyte> Analytes { get; set; }
        public DbSet<Student> Students { get; set; }
        public DbSet<StudentReport> StudentReports { get; set; }
        public DbSet<AnalyteInput> AnalyteInputs { get; set; }
        public DbSet<Images> Images { get; set; }

        /// <summary>
        /// All timestamps are stored as UTC. SQL Server and SQLite hand DateTimes back with Kind=Unspecified, which
        /// System.Text.Json serializes without a "Z"; browsers then parse them as local time and every save shifts
        /// the run date by the UTC offset. Tagging values as UTC on read makes the API always emit ISO-8601 with "Z".
        /// </summary>
        protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
        {
            configurationBuilder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
            configurationBuilder.Properties<DateTime?>().HaveConversion<NullableUtcDateTimeConverter>();
        }

        private sealed class UtcDateTimeConverter() : ValueConverter<DateTime, DateTime>(
            v => v.Kind == DateTimeKind.Local ? v.ToUniversalTime() : v,
            v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

        private sealed class NullableUtcDateTimeConverter() : ValueConverter<DateTime?, DateTime?>(
            v => v.HasValue && v.Value.Kind == DateTimeKind.Local ? v.Value.ToUniversalTime() : v,
            v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v);

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<AdminQCLot>().HasIndex(e => e.LotNumber).IsUnique();
            modelBuilder.Entity<AdminQCLot>().Property(e => e.Department).HasConversion<string>().HasMaxLength(32);

            // Deleting a lot removes its analyte definitions...
            modelBuilder.Entity<AdminQCLot>()
                .HasMany(p => p.Analytes).WithOne().HasForeignKey(e => e.AdminQCLotID)
                .OnDelete(DeleteBehavior.Cascade);

            // ...but never silently deletes student work. The controller refuses to delete a lot with runs.
            modelBuilder.Entity<AdminQCLot>()
                .HasMany(p => p.Reports).WithOne(r => r.AdminQCLot).HasForeignKey(e => e.AdminQCLotID)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Student>()
                .HasMany(p => p.Reports).WithOne(r => r.Student).HasForeignKey(e => e.StudentID)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<Student>().HasIndex(e => e.Username).IsUnique();
            modelBuilder.Entity<Admin>().HasIndex(e => e.Username).IsUnique();

            modelBuilder.Entity<StudentReport>()
                .HasMany(p => p.AnalyteInputs).WithOne().HasForeignKey(e => e.ReportID)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<StudentReport>().Property(e => e.Status).HasConversion<string>().HasMaxLength(16);
            modelBuilder.Entity<StudentReport>().HasIndex(e => new { e.StudentID, e.AdminQCLotID });
            modelBuilder.Entity<StudentReport>().HasIndex(e => e.Status);

            // Seed data is added at runtime by DbSeeder (Development only), not via HasData,
            // so migrations stay stable and contain no demo users.
        }
    }
}
