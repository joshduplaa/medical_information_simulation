using Microsoft.AspNetCore.Identity;

namespace ScrumDumpsterMolecularDiagnostic.Repositories.Interfaces.Auth
{
    public interface ITokenRepository
    {
        string CreateJWTToken(IdentityUser user, List<string> roles, Guid profileId, string displayName);
    }
}
