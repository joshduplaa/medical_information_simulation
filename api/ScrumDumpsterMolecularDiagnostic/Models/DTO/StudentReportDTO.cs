using ScrumDumpsterMolecularDiagnostic.Enums;
using System.ComponentModel.DataAnnotations;

namespace ScrumDumpsterMolecularDiagnostic.Models.DTO
{
    public class AnalyteInputDTO
    {
        public Guid AnalyteID { get; set; }
        public string AnalyteName { get; set; }
        public double AnalyteValue { get; set; }
    }

    /// <summary>One QC run as returned to the client, including enough lot context to render it.</summary>
    public class StudentReportDTO
    {
        public Guid ReportID { get; set; }
        public Guid StudentID { get; set; }
        public string StudentName { get; set; }
        public Guid AdminQCLotID { get; set; }
        public string QCName { get; set; }
        public string LotNumber { get; set; }
        public Department Department { get; set; }
        public ReportStatus Status { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime RunDate { get; set; }
        public DateTime? SubmittedDate { get; set; }
        public string? StudentComment { get; set; }
        public int? Grade { get; set; }
        public string? FacultyComment { get; set; }
        public Guid? ReviewedByAdminID { get; set; }
        public DateTime? ReviewedDate { get; set; }
        public List<AnalyteDTO> Analytes { get; set; } = [];
        public List<AnalyteInputDTO> AnalyteInputs { get; set; } = [];
    }

    public class CreateReportRequestDTO
    {
        [Required]
        public Guid AdminQCLotID { get; set; }
    }

    /// <summary>One value a student enters; the analyte name is looked up server-side.</summary>
    public class ResultInputDTO
    {
        public Guid AnalyteID { get; set; }
        public double AnalyteValue { get; set; }
    }

    public class SaveResultsRequestDTO
    {
        public List<ResultInputDTO> Inputs { get; set; } = [];
        [MaxLength(2000)]
        public string? StudentComment { get; set; }
        public DateTime? RunDate { get; set; }
    }

    public class GradeReportRequestDTO
    {
        [Range(0, 100)]
        public int Grade { get; set; }
        [MaxLength(2000)]
        public string? FacultyComment { get; set; }
    }

    public class ReturnReportRequestDTO
    {
        [Required, MinLength(1), MaxLength(2000)]
        public string FacultyComment { get; set; }
    }

    /// <summary>One point on a Levey-Jennings chart: a submitted result for one analyte from one run.</summary>
    public class LeveyJenningsPointDTO
    {
        public Guid ReportID { get; set; }
        public DateTime RunDate { get; set; }
        public double Value { get; set; }
        public ReportStatus Status { get; set; }
    }

    public class LeveyJenningsSeriesDTO
    {
        public AnalyteDTO Analyte { get; set; }
        public List<LeveyJenningsPointDTO> Points { get; set; } = [];
    }
}
