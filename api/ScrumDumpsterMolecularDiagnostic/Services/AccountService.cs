using ScrumDumpsterMolecularDiagnostic.Auth;
using ScrumDumpsterMolecularDiagnostic.Models.Domain;
using ScrumDumpsterMolecularDiagnostic.Models.DTO.Auth;
using ScrumDumpsterMolecularDiagnostic.Repositories.Interfaces;
using Microsoft.AspNetCore.Identity;

namespace ScrumDumpsterMolecularDiagnostic.Services
{
    public record AccountResult(bool Succeeded, IReadOnlyList<string> Errors, Guid? ProfileId = null);

    /// <summary>
    /// Creates an Identity login plus the matching Admin/Student profile row. The two live in different
    /// DbContexts (auth vs app data), so there is no shared transaction: if the profile insert fails the
    /// Identity user is deleted again so we never leave a login without a profile.
    /// </summary>
    public class AccountService
    {
        private readonly UserManager<IdentityUser> userManager;
        private readonly IAdminRepository adminRepository;
        private readonly IStudentRepository studentRepository;

        public AccountService(UserManager<IdentityUser> userManager, IAdminRepository adminRepository, IStudentRepository studentRepository)
        {
            this.userManager = userManager;
            this.adminRepository = adminRepository;
            this.studentRepository = studentRepository;
        }

        public async Task<AccountResult> CreateAsync(RegisterRequestDTO dto, string role)
        {
            if (role != Roles.Faculty && role != Roles.Student)
                return new(false, ["Unknown role."]);

            if (await userManager.FindByNameAsync(dto.Username) != null)
                return new(false, ["That username is already taken."]);
            if (await userManager.FindByEmailAsync(dto.Email) != null)
                return new(false, ["An account with that email already exists."]);

            var identityUser = new IdentityUser { UserName = dto.Username, Email = dto.Email };
            var created = await userManager.CreateAsync(identityUser, dto.Password);
            if (!created.Succeeded)
                return new(false, created.Errors.Select(e => e.Description).ToList());

            var roleResult = await userManager.AddToRoleAsync(identityUser, role);
            if (!roleResult.Succeeded)
            {
                await userManager.DeleteAsync(identityUser);
                return new(false, roleResult.Errors.Select(e => e.Description).ToList());
            }

            try
            {
                Guid profileId;
                if (role == Roles.Faculty)
                {
                    var admin = await adminRepository.CreateAdminAsync(new Admin
                    {
                        Username = dto.Username, Email = dto.Email, Firstname = dto.Firstname,
                        Lastname = dto.Lastname, Initials = dto.Initials,
                    });
                    profileId = admin.AdminID;
                }
                else
                {
                    var student = await studentRepository.CreateStudentAsync(new Student
                    {
                        Username = dto.Username, Email = dto.Email, Firstname = dto.Firstname,
                        Lastname = dto.Lastname, Initials = dto.Initials,
                    });
                    profileId = student.StudentID;
                }
                return new(true, [], profileId);
            }
            catch
            {
                await userManager.DeleteAsync(identityUser);
                throw;
            }
        }

        /// <summary>Looks up the profile for an Identity user. Returns null if the user has no MIS role/profile.</summary>
        public async Task<UserProfileDTO?> GetProfileAsync(IdentityUser user)
        {
            var roles = await userManager.GetRolesAsync(user);
            if (roles.Contains(Roles.Faculty))
            {
                var admin = await adminRepository.GetAdminByNameAsync(user.UserName!);
                if (admin == null) return null;
                return new UserProfileDTO
                {
                    UserID = admin.AdminID, Username = admin.Username, Email = admin.Email,
                    Firstname = admin.Firstname ?? "", Lastname = admin.Lastname ?? "", Initials = admin.Initials,
                    Role = "faculty",
                };
            }
            if (roles.Contains(Roles.Student))
            {
                var student = await studentRepository.GetStudentByNameAsync(user.UserName!);
                if (student == null) return null;
                return new UserProfileDTO
                {
                    UserID = student.StudentID, Username = student.Username, Email = student.Email,
                    Firstname = student.Firstname, Lastname = student.Lastname, Initials = student.Initials,
                    Role = "student",
                };
            }
            return null;
        }
    }
}
