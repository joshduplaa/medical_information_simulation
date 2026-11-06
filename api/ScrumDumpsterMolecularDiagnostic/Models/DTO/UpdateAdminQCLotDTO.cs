using ScrumDumpsterMolecularDiagnostic.Enums;
using System.ComponentModel.DataAnnotations;

namespace ScrumDumpsterMolecularDiagnostic.Models.DTO
{
    /// <summary>
    /// Full replacement of a lot's editable fields. Analytes with an AnalyteID are updated, analytes without one
    /// are added, and existing analytes missing from the list are removed (only allowed while the lot has no runs).
    /// </summary>
    public class UpdateAdminQCLotDTO : IValidatableObject
    {
        [Required, MaxLength(100)]
        public string QCName { get; set; }
        [EnumDataType(typeof(Department))]
        public Department Department { get; set; }
        public DateTime OpenDate { get; set; }
        public DateTime? ClosedDate { get; set; }
        public DateTime ExpirationDate { get; set; }
        public DateTime? FileDate { get; set; }
        public bool IsActive { get; set; } = true;
        [MinLength(1, ErrorMessage = "A QC lot needs at least one analyte")]
        public List<AddAnalyteWithListDTO> Analytes { get; set; } = [];

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if (ExpirationDate <= OpenDate)
                yield return new ValidationResult("Expiration date must be after the open date.", [nameof(ExpirationDate)]);
        }
    }
}
