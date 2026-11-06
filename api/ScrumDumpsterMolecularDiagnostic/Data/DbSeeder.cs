using ScrumDumpsterMolecularDiagnostic.Auth;
using ScrumDumpsterMolecularDiagnostic.Enums;
using ScrumDumpsterMolecularDiagnostic.Models.Domain;
using ScrumDumpsterMolecularDiagnostic.Models.DTO.Auth;
using ScrumDumpsterMolecularDiagnostic.Services;
using Microsoft.EntityFrameworkCore;

namespace ScrumDumpsterMolecularDiagnostic.Data
{
    /// <summary>
    /// Repeatable SYNTHETIC demo data for local development. Every person, lot number and result here is
    /// invented. It runs only when Seed:Enabled is true (Development by default) and does nothing if any faculty
    /// account already exists, so restarting the API never duplicates data.
    /// Values are generated from a fixed random seed so every fresh database looks the same.
    /// </summary>
    public class DbSeeder
    {
        public const string FacultyUsername = "faculty";
        public const string StudentUsername = "student";

        private readonly MedicalInformationDbContext db;
        private readonly AccountService accounts;
        private readonly IConfiguration config;
        private readonly ILogger<DbSeeder> logger;

        public DbSeeder(MedicalInformationDbContext db, AccountService accounts, IConfiguration config, ILogger<DbSeeder> logger)
        {
            this.db = db;
            this.accounts = accounts;
            this.config = config;
            this.logger = logger;
        }

        private Guid facultyId;

        private record AnalyteSpec(string Name, string Acronym, string Unit, double Mean, double Sd);

        public async Task SeedAsync()
        {
            if (await db.Admins.AnyAsync())
            {
                logger.LogInformation("Seed skipped: data already present.");
                return;
            }

            var facultyPassword = config["Seed:FacultyPassword"] ?? "Faculty123!";
            var studentPassword = config["Seed:StudentPassword"] ?? "Student123!";

            facultyId = await Create(new() { Username = FacultyUsername, Email = "faculty@mis.example.edu", Firstname = "Morgan", Lastname = "Reyes", Initials = "MR", Password = facultyPassword }, Roles.Faculty);
            var alex = await Create(new() { Username = StudentUsername, Email = "student@mis.example.edu", Firstname = "Alex", Lastname = "Rivera", Initials = "AR", Password = studentPassword }, Roles.Student);
            var jordan = await Create(new() { Username = "jlee", Email = "jlee@mis.example.edu", Firstname = "Jordan", Lastname = "Lee", Initials = "JL", Password = studentPassword }, Roles.Student);
            var sam = await Create(new() { Username = "spatel", Email = "spatel@mis.example.edu", Firstname = "Sam", Lastname = "Patel", Initials = "SP", Password = studentPassword }, Roles.Student);

            var today = DateTime.UtcNow.Date;

            var bmp1 = Lot("BMP Level I", "BMP1-260901", Department.Chemistry, today.AddDays(-45), today.AddDays(320),
            [
                new("Sodium", "Na", "mmol/L", 140, 1.5),
                new("Potassium", "K", "mmol/L", 4.2, 0.1),
                new("Chloride", "Cl", "mmol/L", 102, 1.5),
                new("Carbon Dioxide", "CO2", "mmol/L", 25, 1.0),
                new("Blood Urea Nitrogen", "BUN", "mg/dL", 15, 0.8),
                new("Creatinine", "CREA", "mg/dL", 1.0, 0.05),
                new("Glucose", "GLU", "mg/dL", 95, 2.5),
                new("Calcium", "CA", "mg/dL", 9.5, 0.15),
            ]);
            var bmp2 = Lot("BMP Level II", "BMP2-260901", Department.Chemistry, today.AddDays(-45), today.AddDays(320),
            [
                new("Sodium", "Na", "mmol/L", 155, 1.8),
                new("Potassium", "K", "mmol/L", 6.5, 0.15),
                new("Glucose", "GLU", "mg/dL", 280, 6.0),
                new("Creatinine", "CREA", "mg/dL", 5.8, 0.2),
            ]);
            var sars = Lot("SARS-CoV-2 PCR Positive Control", "MOL-CV2-2611", Department.Molecular, today.AddDays(-30), today.AddDays(150),
            [
                new("N gene Ct", "N", "Ct", 28.0, 0.8),
                new("RdRp gene Ct", "RdRp", "Ct", 29.5, 0.9),
                new("RNase P (internal control) Ct", "RP", "Ct", 26.0, 0.7),
            ]);
            var sti = Lot("CT/NG NAAT Positive Control", "MOL-STI-2610", Department.Molecular, today.AddDays(-30), today.AddDays(150),
            [
                new("Chlamydia trachomatis Ct", "CT", "Ct", 30.5, 1.0),
                new("Neisseria gonorrhoeae Ct", "NG", "Ct", 31.2, 1.1),
            ]);
            var cbc = Lot("CBC Control Normal", "HEM-CBCN-2609", Department.Hematology, today.AddDays(-20), today.AddDays(60),
            [
                new("White Blood Cells", "WBC", "x10^3/uL", 7.0, 0.3),
                new("Hemoglobin", "HGB", "g/dL", 13.5, 0.3),
                new("Platelets", "PLT", "x10^3/uL", 250, 12),
            ]);
            // An older, closed lot so the faculty view shows lot rollover history.
            var oldBmp = Lot("BMP Level I", "BMP1-260301", Department.Chemistry, today.AddDays(-230), today.AddDays(-46), bmp1.Analytes.Select(a => new AnalyteSpec(a.AnalyteName, a.AnalyteAcronym, a.UnitOfMeasure, a.Mean, a.StdDevi)).ToArray());
            oldBmp.IsActive = false;
            oldBmp.ClosedDate = today.AddDays(-45);

            db.AdminQCLots.AddRange(bmp1, bmp2, sars, sti, cbc, oldBmp);
            await db.SaveChangesAsync();

            var rng = new Random(20261105);

            // Alex: 14 daily runs on BMP Level I. Glucose drifts high on runs 10-11 (a 2-2s rejection) and
            // potassium has one 1-3s outlier on run 6, so the Levey-Jennings charts have something to teach.
            for (var day = 0; day < 14; day++)
            {
                var runDate = today.AddDays(-14 + day).AddHours(8);
                var status = day switch { < 10 => ReportStatus.Graded, 10 or 11 => ReportStatus.Submitted, 12 => ReportStatus.Returned, _ => ReportStatus.InProgress };
                var shifts = new Dictionary<string, double>();
                if (day is 10 or 11) shifts["Glucose"] = 2.4;
                if (day == 6) shifts["Potassium"] = 3.3;
                AddRun(alex, bmp1, runDate, status, rng, shifts, status == ReportStatus.InProgress ? 0.5 : 1.0);
            }
            for (var day = 0; day < 6; day++)
                AddRun(alex, sars, today.AddDays(-6 + day).AddHours(9), day < 5 ? ReportStatus.Graded : ReportStatus.Submitted, rng, new());

            for (var day = 0; day < 8; day++)
                AddRun(jordan, bmp1, today.AddDays(-8 + day).AddHours(10), day < 7 ? ReportStatus.Graded : ReportStatus.Submitted, rng, new());
            for (var day = 0; day < 5; day++)
                AddRun(sam, cbc, today.AddDays(-5 + day).AddHours(11), day < 4 ? ReportStatus.Graded : ReportStatus.Submitted, rng, new());

            await db.SaveChangesAsync();
            logger.LogInformation("Seeded synthetic demo data (faculty '{Faculty}', student '{Student}').", FacultyUsername, StudentUsername);
        }

        private async Task<Guid> Create(RegisterRequestDTO dto, string role)
        {
            var result = await accounts.CreateAsync(dto, role);
            if (!result.Succeeded) throw new InvalidOperationException($"Seeding {dto.Username} failed: {string.Join("; ", result.Errors)}");
            return result.ProfileId!.Value;
        }

        private static AdminQCLot Lot(string name, string lotNumber, Department dept, DateTime open, DateTime expires, AnalyteSpec[] analytes)
        {
            var lot = new AdminQCLot
            {
                AdminQCLotID = Guid.NewGuid(), QCName = name, LotNumber = lotNumber, Department = dept,
                OpenDate = open, ExpirationDate = expires, FileDate = open, IsActive = true,
            };
            foreach (var a in analytes)
            {
                lot.Analytes.Add(new Analyte
                {
                    AnalyteID = Guid.NewGuid(), AdminQCLotID = lot.AdminQCLotID, AnalyteName = a.Name, AnalyteAcronym = a.Acronym,
                    UnitOfMeasure = a.Unit, Mean = a.Mean, StdDevi = a.Sd,
                    // Acceptable range shown to students: mean ± 2 SD (the usual working range for a control).
                    MinLevel = Math.Round(a.Mean - 2 * a.Sd, 2), MaxLevel = Math.Round(a.Mean + 2 * a.Sd, 2),
                });
            }
            return lot;
        }

        /// <summary>Adds one run. Values are mean + z·SD with z drawn from N(0, 0.8²) plus any planted shift.</summary>
        private void AddRun(Guid studentId, AdminQCLot lot, DateTime runDate, ReportStatus status, Random rng, Dictionary<string, double> shiftsInSd, double fractionEntered = 1.0)
        {
            var report = new StudentReport
            {
                ReportID = Guid.NewGuid(), StudentID = studentId, AdminQCLotID = lot.AdminQCLotID, Status = status,
                CreatedDate = runDate, RunDate = runDate,
            };
            var analytes = lot.Analytes.OrderBy(a => a.AnalyteName).ToList();
            var count = (int)Math.Ceiling(analytes.Count * fractionEntered);
            foreach (var a in analytes.Take(count))
            {
                var z = Gaussian(rng) * 0.8 + shiftsInSd.GetValueOrDefault(a.AnalyteName);
                var decimals = a.StdDevi < 0.2 ? 2 : 1;
                report.AnalyteInputs.Add(new AnalyteInput
                {
                    AnalyteInputID = Guid.NewGuid(), ReportID = report.ReportID, AnalyteID = a.AnalyteID,
                    AnalyteName = a.AnalyteName, AnalyteValue = Math.Round(a.Mean + z * a.StdDevi, decimals),
                });
            }

            if (status != ReportStatus.InProgress)
            {
                report.SubmittedDate = runDate.AddHours(1);
                report.StudentComment = "Controls run on analyzer 1 after daily maintenance.";
            }
            if (status == ReportStatus.Graded)
            {
                report.Grade = 85 + rng.Next(0, 16);
                report.FacultyComment = "Results documented correctly.";
                report.ReviewedByAdminID = facultyId;
                report.ReviewedDate = runDate.AddHours(5);
            }
            if (status == ReportStatus.Returned)
            {
                report.ReviewedByAdminID = facultyId;
                report.FacultyComment = "Re-check the chloride value against the analyzer printout and resubmit.";
                report.ReviewedDate = runDate.AddHours(5);
            }
            db.StudentReports.Add(report);
        }

        private static double Gaussian(Random rng)
        {
            // Box–Muller transform
            var u1 = 1.0 - rng.NextDouble();
            var u2 = rng.NextDouble();
            return Math.Sqrt(-2.0 * Math.Log(u1)) * Math.Cos(2.0 * Math.PI * u2);
        }
    }
}
