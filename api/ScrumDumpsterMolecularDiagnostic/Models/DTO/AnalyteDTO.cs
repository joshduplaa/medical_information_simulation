using System.ComponentModel.DataAnnotations;

namespace ScrumDumpsterMolecularDiagnostic.Models.DTO
{
    public class AnalyteDTO
    {
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

    /// <summary>Analyte definition sent when creating or editing a lot.</summary>
    public class AddAnalyteWithListDTO : IValidatableObject
    {
        /// <summary>Present when editing an existing analyte; omitted for a new one.</summary>
        public Guid? AnalyteID { get; set; }
        [Required, MaxLength(100)]
        public string AnalyteName { get; set; }
        [Required, MaxLength(20)]
        public string AnalyteAcronym { get; set; }
        [Required, MaxLength(20)]
        public string UnitOfMeasure { get; set; }
        public double MinLevel { get; set; }
        public double MaxLevel { get; set; }
        public double Mean { get; set; }
        public double StdDevi { get; set; }

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if (StdDevi <= 0)
                yield return new ValidationResult($"{AnalyteName}: standard deviation must be greater than 0.", [nameof(StdDevi)]);
            if (MaxLevel < MinLevel)
                yield return new ValidationResult($"{AnalyteName}: max level must be greater than or equal to min level.", [nameof(MaxLevel)]);
        }
    }
}
