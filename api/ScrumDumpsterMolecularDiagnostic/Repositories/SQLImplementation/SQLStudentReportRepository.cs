using ScrumDumpsterMolecularDiagnostic.Data;
using ScrumDumpsterMolecularDiagnostic.Enums;
using ScrumDumpsterMolecularDiagnostic.Models.Domain;
using ScrumDumpsterMolecularDiagnostic.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ScrumDumpsterMolecularDiagnostic.Repositories.SQLImplementation
{
    public class SQLStudentReportRepository : IStudentReportRepository
    {
        private readonly MedicalInformationDbContext dbContext;

        public SQLStudentReportRepository(MedicalInformationDbContext dbContext)
        {
            this.dbContext = dbContext;
        }

        private IQueryable<StudentReport> WithDetails(IQueryable<StudentReport> query) =>
            query.Include(r => r.Student)
                 .Include(r => r.AdminQCLot).ThenInclude(l => l!.Analytes)
                 .Include(r => r.AnalyteInputs)
                 .AsSplitQuery();

        public async Task<StudentReport> CreateAsync(StudentReport report)
        {
            await dbContext.StudentReports.AddAsync(report);
            await dbContext.SaveChangesAsync();
            return report;
        }

        public Task<StudentReport?> GetByIdAsync(Guid id) =>
            WithDetails(dbContext.StudentReports).FirstOrDefaultAsync(r => r.ReportID == id);

        public async Task<List<StudentReport>> GetForStudentAsync(Guid studentId, ReportStatus? status = null)
        {
            var query = dbContext.StudentReports.AsNoTracking().Where(r => r.StudentID == studentId);
            if (status != null) query = query.Where(r => r.Status == status);
            var list = await WithDetails(query).ToListAsync();
            return list.OrderByDescending(r => r.RunDate).ToList();
        }

        public async Task<List<StudentReport>> GetAllAsync(ReportStatus? status = null)
        {
            var query = dbContext.StudentReports.AsNoTracking().AsQueryable();
            if (status != null) query = query.Where(r => r.Status == status);
            var list = await WithDetails(query).ToListAsync();
            return list.OrderByDescending(r => r.SubmittedDate ?? r.RunDate).ToList();
        }

        public async Task<List<StudentReport>> GetHistoryAsync(Guid studentId, Guid lotId)
        {
            var list = await dbContext.StudentReports.AsNoTracking()
                .Where(r => r.StudentID == studentId && r.AdminQCLotID == lotId && r.Status != ReportStatus.InProgress)
                .Include(r => r.AnalyteInputs)
                .ToListAsync();
            return list.OrderBy(r => r.RunDate).ToList();
        }

        public Task SaveChangesAsync() => dbContext.SaveChangesAsync();
    }
}
