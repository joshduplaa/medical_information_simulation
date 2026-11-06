using ScrumDumpsterMolecularDiagnostic.Enums;
using ScrumDumpsterMolecularDiagnostic.Models.Domain;

namespace ScrumDumpsterMolecularDiagnostic.Repositories.Interfaces
{
    public interface IStudentReportRepository
    {
        Task<StudentReport> CreateAsync(StudentReport report);
        /// <summary>Loads the run with its student, lot, analytes and inputs (tracked, so callers can modify and save).</summary>
        Task<StudentReport?> GetByIdAsync(Guid id);
        Task<List<StudentReport>> GetForStudentAsync(Guid studentId, ReportStatus? status = null);
        Task<List<StudentReport>> GetAllAsync(ReportStatus? status = null);
        /// <summary>Non-InProgress runs for one student on one lot, oldest first. Feeds the Levey-Jennings chart.</summary>
        Task<List<StudentReport>> GetHistoryAsync(Guid studentId, Guid lotId);
        Task SaveChangesAsync();
    }
}
