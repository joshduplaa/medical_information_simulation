using AutoMapper;
using ScrumDumpsterMolecularDiagnostic.Auth;
using ScrumDumpsterMolecularDiagnostic.Models.DTO;
using ScrumDumpsterMolecularDiagnostic.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ScrumDumpsterMolecularDiagnostic.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = Roles.Faculty)]
    public class AdminsController : ControllerBase
    {
        private readonly IAdminRepository adminRepository;
        private readonly IMapper mapper;

        public AdminsController(IAdminRepository adminRepository, IMapper mapper)
        {
            this.adminRepository = adminRepository;
            this.mapper = mapper;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllAdmins([FromQuery] string? filterQuery)
        {
            var admins = await adminRepository.GetAdminAsync(filterQuery);
            return Ok(mapper.Map<List<AdminDTO>>(admins));
        }

        [HttpGet("{id:Guid}")]
        public async Task<IActionResult> GetAdminById([FromRoute] Guid id)
        {
            var admin = await adminRepository.GetAdminByIdAsync(id);
            if (admin == null) return NotFound();
            return Ok(mapper.Map<AdminDTO>(admin));
        }

        [HttpDelete("{id:Guid}")]
        public async Task<IActionResult> DeleteAdmin([FromRoute] Guid id)
        {
            if (User.GetProfileId() == id) return BadRequest("You cannot delete your own faculty account.");
            var admin = await adminRepository.DeleteAdminAsync(id);
            if (admin == null) return NotFound("Admin does not exist");
            return Ok(mapper.Map<AdminDTO>(admin));
        }
    }
}
