using System.Security.Claims;

namespace ScrumDumpsterMolecularDiagnostic.Auth
{
    public static class ClaimsPrincipalExtensions
    {
        /// <summary>The signed-in user's Admin/Student profile id, or null if the token has none.</summary>
        public static Guid? GetProfileId(this ClaimsPrincipal user) =>
            Guid.TryParse(user.FindFirstValue(ClaimNames.ProfileId), out var id) ? id : null;

        public static bool IsFaculty(this ClaimsPrincipal user) => user.IsInRole(Roles.Faculty);
    }
}
