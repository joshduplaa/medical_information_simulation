using System.ComponentModel.DataAnnotations;

namespace ScrumDumpsterMolecularDiagnostic.Models.Domain
{
    /// <summary>
    /// One analyte on a QC lot, with the lot's target statistics.
    /// Mean and StdDevi are the established target values used for z-scores and Levey-Jennings limits.
    /// MinLevel/MaxLevel are the manufacturer's acceptable range shown to students.
    /// </summary>
    public class Analyte
    {
        [Key]
        public Guid AnalyteID { get; set; }
        public string AnalyteName { get; set; }
        public string AnalyteAcronym { get; set; }
        public string UnitOfMeasure { get; set; }
        public double MinLevel { get; set; }
        public double MaxLevel { get; set; }
        public double Mean { get; set; }
        public double StdDevi { get; set; }
        public Guid AdminQCLotID { get; set; }
    }
}
