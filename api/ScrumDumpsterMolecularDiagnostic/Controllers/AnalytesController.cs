using AutoMapper;
using ScrumDumpsterMolecularDiagnostic.Auth;
using ScrumDumpsterMolecularDiagnostic.Models.Domain;
using ScrumDumpsterMolecularDiagnostic.Models.DTO;
using ScrumDumpsterMolecularDiagnostic.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ScrumDumpsterMolecularDiagnostic.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AnalytesController : ControllerBase
    {
        private readonly IAnalyteRepository analyteRepository;
        private readonly IAdminQCLotRepository lotRepository;
        private readonly IMapper mapper;

        public AnalytesController(IAnalyteRepository analyteRepository, IAdminQCLotRepository lotRepository, IMapper mapper)
        {
            this.analyteRepository = analyteRepository;
            this.lotRepository = lotRepository;
            this.mapper = mapper;
        }

        [HttpGet]
        [Authorize(Roles = Roles.Faculty)]
        public async Task<IActionResult> GetAllAnalytes()
        {
            var analytes = await analyteRepository.GetAllAnalytesAsync();
            return Ok(mapper.Map<List<AnalyteDTO>>(analytes));
        }

        [HttpGet("{lotId:Guid}")]
        public async Task<IActionResult> GetAllAnalytesFromQCLot([FromRoute] Guid lotId)
        {
            var analytes = await analyteRepository.GetAllAnalytesFromQCLotAsync(lotId);
            return Ok(mapper.Map<List<AnalyteDTO>>(analytes));
        }

        [HttpPost("{lotId:Guid}")]
        [Authorize(Roles = Roles.Faculty)]
        public async Task<IActionResult> CreateAnalyte([FromRoute] Guid lotId, [FromBody] AddAnalyteRequestDTO dto)
        {
            if (await lotRepository.GetQCLotByIDAsync(lotId) == null) return NotFound();

            var analyte = mapper.Map<Analyte>(dto);
            analyte.AnalyteID = Guid.NewGuid();
            analyte.AdminQCLotID = lotId; // previously the route lotId was ignored
            await analyteRepository.CreateAnalyteAsync(analyte);

            // previously CreatedAtAction("Get", ...) pointed at an action that does not exist and threw at runtime
            return CreatedAtAction(nameof(GetAllAnalytesFromQCLot), new { lotId }, mapper.Map<AnalyteDTO>(analyte));
        }
    }
}
