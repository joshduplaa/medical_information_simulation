namespace ScrumDumpsterMolecularDiagnostic.Auth
{
    /// <summary>
    /// Role names stored in ASP.NET Identity. "Admin" is the faculty role (the name predates this branch
    /// and is kept so existing role IDs and tokens stay compatible).
    /// </summary>
    public static class Roles
    {
        public const string Faculty = "Admin";
        public const string Student = "Student";
    }

    public static class ClaimNames
    {
        /// <summary>The Admin.AdminID or Student.StudentID that belongs to the signed-in Identity user.</summary>
        public const string ProfileId = "mis:profile_id";
    }
}
