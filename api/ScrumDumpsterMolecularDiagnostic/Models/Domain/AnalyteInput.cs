using System.ComponentModel.DataAnnotations;

namespace ScrumDumpsterMolecularDiagnostic.Models.Domain
{
    /// <summary>One result value a student entered for one analyte in one QC run.</summary>
    public class AnalyteInput
    {
        [Key]
        public Guid AnalyteInputID { get; set; }
        public Guid ReportID { get; set; }
        public Guid AnalyteID { get; set; }
        public string AnalyteName { get; set; }
        public double AnalyteValue { get; set; }
    }
}
