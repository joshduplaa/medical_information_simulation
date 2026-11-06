using ScrumDumpsterMolecularDiagnostic.Enums;

namespace ScrumDumpsterMolecularDiagnostic.Models.DTO
{
    public class AdminQCLotDTO
    {
        public Guid AdminQCLotID { get; set; }
        public string QCName { get; set; }
        public string LotNumber { get; set; }
        public DateTime OpenDate { get; set; }
        public DateTime? ClosedDate { get; set; }
        public DateTime? FileDate { get; set; }
        public DateTime ExpirationDate { get; set; }
        public bool IsActive { get; set; }
        public Department Department { get; set; }
        public ICollection<AnalyteDTO> Analytes { get; set; } = [];
        /// <summary>Number of student runs recorded on this lot (lots with runs cannot be deleted).</summary>
        public int ReportCount { get; set; }
    }
}
