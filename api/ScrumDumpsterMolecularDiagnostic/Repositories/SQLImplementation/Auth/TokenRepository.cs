using ScrumDumpsterMolecularDiagnostic.Auth;
using ScrumDumpsterMolecularDiagnostic.Repositories.Interfaces.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace ScrumDumpsterMolecularDiagnostic.Repositories.SQLImplementation.Auth
{
    public class TokenRepository : ITokenRepository
    {
        private readonly IConfiguration appconfig;

        public TokenRepository(IConfiguration appconfig)
        {
            this.appconfig = appconfig;
        }

        public string CreateJWTToken(IdentityUser user, List<string> roles, Guid profileId, string displayName)
        {
            var claims = new List<Claim>
            {
                new(JwtRegisteredClaimNames.Sub, user.Id),
                new(ClaimTypes.Name, user.UserName ?? ""),
                new(ClaimTypes.GivenName, displayName),
                new(ClaimNames.ProfileId, profileId.ToString()),
                new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            };
            claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(appconfig["Jwt:Key"]!));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var lifetime = TimeSpan.FromMinutes(appconfig.GetValue("Jwt:LifetimeMinutes", 480));

            var token = new JwtSecurityToken(
                issuer: appconfig["Jwt:Issuer"],
                audience: appconfig["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.Add(lifetime),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
