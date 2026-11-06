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
    [Authorize]
    public class StudentsController : ControllerBase
    {
        private readonly IStudentRepository studentRepository;
        private readonly IMapper mapper;

        public StudentsController(IStudentRepository studentRepository, IMapper mapper)
        {
            this.studentRepository = studentRepository;
            this.mapper = mapper;
        }

        [HttpGet]
        [Authorize(Roles = Roles.Faculty)]
        public async Task<IActionResult> GetAllStudents()
        {
            var students = await studentRepository.GetAllStudentsAsync();
            return Ok(mapper.Map<List<StudentDTO>>(students.OrderBy(s => s.Lastname).ThenBy(s => s.Firstname)));
        }

        /// <summary>Faculty can view any student; a student can view only themselves.</summary>
        [HttpGet("{id:Guid}")]
        public async Task<IActionResult> GetStudentByID([FromRoute] Guid id)
        {
            if (!User.IsFaculty() && User.GetProfileId() != id) return Forbid();

            var student = await studentRepository.GetStudentByIDAsync(id);
            if (student == null) return NotFound("Student not found");
            return Ok(mapper.Map<StudentDTO>(student)); // previously returned the domain entity
        }

        [HttpDelete("{id:Guid}")]
        [Authorize(Roles = Roles.Faculty)]
        public async Task<IActionResult> DeleteStudent([FromRoute] Guid id)
        {
            var student = await studentRepository.DeleteStudentAsync(id);
            if (student == null) return NotFound("Student not found");
            return Ok(mapper.Map<StudentDTO>(student));
        }
    }
}
