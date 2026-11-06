using ScrumDumpsterMolecularDiagnostic.Enums;
using System.ComponentModel.DataAnnotations;

namespace ScrumDumpsterMolecularDiagnostic.Models.DTO
{
    public class AddAdminQCLotRequestDTO : IValidatableObject
    {
        [Required]
        [MinLength(8, ErrorMessage = "Lot number must be at least 8 characters")]
        [MaxLength(40)]
        public string LotNumber { get; set; }
        [Required, MaxLength(100)]
        public string QCName { get; set; }
        public DateTime OpenDate { get; set; }
        public DateTime? ClosedDate { get; set; }
        public DateTime ExpirationDate { get; set; }
        public DateTime? FileDate { get; set; }
        public bool IsActive { get; set; } = true;
        [EnumDataType(typeof(Department))]
        public Department Department { get; set; }
        [MinLength(1, ErrorMessage = "A QC lot needs at least one analyte")]
        public List<AddAnalyteWithListDTO> Analytes { get; set; } = [];

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if (ExpirationDate <= OpenDate)
                yield return new ValidationResult("Expiration date must be after the open date.", [nameof(ExpirationDate)]);
            var duplicate = Analytes.GroupBy(a => a.AnalyteName.Trim().ToLowerInvariant()).FirstOrDefault(g => g.Count() > 1);
            if (duplicate != null)
                yield return new ValidationResult($"Analyte '{duplicate.Key}' is listed more than once.", [nameof(Analytes)]);
        }
    }
}
