namespace ScrumDumpsterMolecularDiagnostic.Models.DTO.Auth
{
    public class LoginResponseDTO
    {
        public string JwtToken { get; set; }
        public DateTime ExpiresAt { get; set; }
        public UserProfileDTO User { get; set; }
    }

    public class UserProfileDTO
    {
        /// <summary>Admin.AdminID or Student.StudentID.</summary>
        public Guid UserID { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public string Firstname { get; set; }
        public string Lastname { get; set; }
        public string Initials { get; set; }
        /// <summary>"faculty" or "student".</summary>
        public string Role { get; set; }
    }
}
