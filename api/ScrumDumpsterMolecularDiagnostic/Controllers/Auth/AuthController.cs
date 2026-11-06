using Microsoft.AspNetCore.RateLimiting;
using ScrumDumpsterMolecularDiagnostic.Auth;
using ScrumDumpsterMolecularDiagnostic.Models.DTO.Auth;
using ScrumDumpsterMolecularDiagnostic.Repositories.Interfaces.Auth;
using ScrumDumpsterMolecularDiagnostic.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.IdentityModel.Tokens.Jwt;

namespace ScrumDumpsterMolecularDiagnostic.Controllers.Auths
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<IdentityUser> userManager;
        private readonly ITokenRepository tokenRepository;
        private readonly AccountService accountService;

        public AuthController(UserManager<IdentityUser> userManager, ITokenRepository tokenRepository, AccountService accountService)
        {
            this.userManager = userManager;
            this.tokenRepository = tokenRepository;
            this.accountService = accountService;
        }

        /// <summary>Public self-registration. Always creates a Student account.</summary>
        [HttpPost("Register")]
        [AllowAnonymous]
        [EnableRateLimiting(RateLimitPolicies.Auth)]
        public async Task<IActionResult> Register([FromBody] RegisterRequestDTO requestDTO)
        {
            var result = await accountService.CreateAsync(requestDTO, Roles.Student);
            if (!result.Succeeded) return ValidationFailure(result.Errors);
            return Ok(new { message = "Account created. You can now sign in.", userId = result.ProfileId });
        }

        /// <summary>Faculty create other faculty accounts.</summary>
        [HttpPost("RegisterFaculty")]
        [Authorize(Roles = Roles.Faculty)]
        public async Task<IActionResult> RegisterFaculty([FromBody] RegisterRequestDTO requestDTO)
        {
            var result = await accountService.CreateAsync(requestDTO, Roles.Faculty);
            if (!result.Succeeded) return ValidationFailure(result.Errors);
            return Ok(new { message = "Faculty account created.", userId = result.ProfileId });
        }

        /// <summary>Sign in with username or email. Returns a JWT for the Authorization: Bearer header.</summary>
        [HttpPost("Login")]
        [HttpPost("LoginByUsername")] // route used by the original client
        [AllowAnonymous]
        [EnableRateLimiting(RateLimitPolicies.Auth)]
        public async Task<IActionResult> Login([FromBody] LoginRequestDTO loginDTO)
        {
            var user = loginDTO.Username.Contains('@')
                ? await userManager.FindByEmailAsync(loginDTO.Username)
                : await userManager.FindByNameAsync(loginDTO.Username);

            // One generic message for every failure so the endpoint does not reveal which accounts exist.
            var invalid = Unauthorized(new ProblemDetails { Title = "Invalid username or password.", Status = 401 });
            if (user == null) return invalid;

            if (await userManager.IsLockedOutAsync(user))
                return Unauthorized(new ProblemDetails { Title = "Account temporarily locked after repeated failed sign-ins. Try again later.", Status = 401 });

            if (!await userManager.CheckPasswordAsync(user, loginDTO.Password))
            {
                await userManager.AccessFailedAsync(user);
                return invalid;
            }
            await userManager.ResetAccessFailedCountAsync(user);

            var profile = await accountService.GetProfileAsync(user);
            if (profile == null) return invalid;

            var roles = (await userManager.GetRolesAsync(user)).ToList();
            var token = tokenRepository.CreateJWTToken(user, roles, profile.UserID, $"{profile.Firstname} {profile.Lastname}".Trim());

            return Ok(new LoginResponseDTO
            {
                JwtToken = token,
                ExpiresAt = new JwtSecurityTokenHandler().ReadJwtToken(token).ValidTo,
                User = profile,
            });
        }

        /// <summary>The signed-in user's profile (used by the client to restore a session).</summary>
        [HttpGet("Me")]
        [Authorize]
        public async Task<IActionResult> Me()
        {
            var user = await userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();
            var profile = await accountService.GetProfileAsync(user);
            return profile == null ? Unauthorized() : Ok(profile);
        }

        private IActionResult ValidationFailure(IReadOnlyList<string> errors)
        {
            var problem = new ValidationProblemDetails(new Dictionary<string, string[]> { [""] = errors.ToArray() })
            {
                Title = errors.FirstOrDefault() ?? "Registration failed.",
                Status = 400,
            };
            return BadRequest(problem);
        }
    }
}
