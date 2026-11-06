using ScrumDumpsterMolecularDiagnostic.Validators;
using System.ComponentModel.DataAnnotations;

namespace ScrumDumpsterMolecularDiagnostic.Models.DTO.Auth
{
    /// <summary>
    /// Self-registration. The role is NOT taken from the request: public sign-up always creates a student.
    /// Faculty accounts are created by an existing faculty member (POST api/Auth/RegisterFaculty).
    /// </summary>
    public class RegisterRequestDTO
    {
        [Required, MinLength(3), MaxLength(50)]
        [RegularExpression(@"^[A-Za-z0-9._-]+$", ErrorMessage = "Username may contain letters, digits, '.', '_' and '-'.")]
        public string Username { get; set; }

        [Required, EmailAddress, MaxLength(256)]
        public string Email { get; set; }

        [Required]
        [DataType(DataType.Password)]
        [MinLength(8, ErrorMessage = "Password has to be at least 8 characters")]
        [PasswordComplexity]
        public string Password { get; set; }

        [Required, MaxLength(100)]
        public string Firstname { get; set; }

        [Required, MaxLength(100)]
        public string Lastname { get; set; }

        [Required, MaxLength(5)]
        public string Initials { get; set; }
    }
}
