using System.ComponentModel.DataAnnotations;
using ScrumDumpsterMolecularDiagnostic.Enums;

namespace ScrumDumpsterMolecularDiagnostic.Models.Domain
{
    /// <summary>
    /// One QC run a student ordered on a lot. It carries the entered results, the submission,
    /// and the faculty review/grade.
    /// </summary>
    public class StudentReport
    {
        [Key]
        public Guid ReportID { get; set; }
        public Guid StudentID { get; set; }
        public Student? Student { get; set; }
        public Guid AdminQCLotID { get; set; }
        public AdminQCLot? AdminQCLot { get; set; }

        public ReportStatus Status { get; set; } = ReportStatus.InProgress;
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
        /// <summary>When the run was performed (the x-axis of the Levey-Jennings chart).</summary>
        public DateTime RunDate { get; set; } = DateTime.UtcNow;
        public DateTime? SubmittedDate { get; set; }
        [MaxLength(2000)]
        public string? StudentComment { get; set; }

        public int? Grade { get; set; }
        [MaxLength(2000)]
        public string? FacultyComment { get; set; }
        public Guid? ReviewedByAdminID { get; set; }
        public DateTime? ReviewedDate { get; set; }

        public ICollection<AnalyteInput> AnalyteInputs { get; set; } = [];
    }
}
