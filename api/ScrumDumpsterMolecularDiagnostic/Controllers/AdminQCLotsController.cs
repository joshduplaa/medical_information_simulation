using AutoMapper;
using ScrumDumpsterMolecularDiagnostic.Auth;
using ScrumDumpsterMolecularDiagnostic.Enums;
using ScrumDumpsterMolecularDiagnostic.Models.Domain;
using ScrumDumpsterMolecularDiagnostic.Models.DTO;
using ScrumDumpsterMolecularDiagnostic.Models.ErrorHandling;
using ScrumDumpsterMolecularDiagnostic.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ScrumDumpsterMolecularDiagnostic.Controllers
{
    /// <summary>QC lots: everyone signed in can read; only faculty can create, edit or delete.</summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AdminQCLotsController : ControllerBase
    {
        private readonly IAdminQCLotRepository adminQCLotRepository;
        private readonly IMapper mapper;

        public AdminQCLotsController(IAdminQCLotRepository adminQCLotRepository, IMapper mapper)
        {
            this.adminQCLotRepository = adminQCLotRepository;
            this.mapper = mapper;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllQCLots([FromQuery] bool activeOnly = false)
        {
            // Students only ever see lots they can order.
            if (!User.IsFaculty()) activeOnly = true;
            var lots = await adminQCLotRepository.GetAllQCLotsAsync(activeOnly);
            return Ok(mapper.Map<List<AdminQCLotDTO>>(lots));
        }

        [HttpGet("{id:Guid}")]
        public async Task<IActionResult> GetQCLotById([FromRoute] Guid id)
        {
            var lot = await adminQCLotRepository.GetQCLotByIDAsync(id);
            if (lot == null) return NotFound(new RequestErrorObject { ErrorCode = ErrorCode.NotFound, Message = "QC lot not found." });
            return Ok(mapper.Map<AdminQCLotDTO>(lot));
        }

        [HttpGet("ByName")]
        public async Task<IActionResult> GetQCLotByName([FromQuery] string? name, [FromQuery] string? dep)
        {
            Department? department = Enum.TryParse(dep, true, out Department parsed) ? parsed : null;
            var lot = await adminQCLotRepository.GetAdminQCLotByNameAsync(name, department);
            if (lot == null) return NotFound(new RequestErrorObject { ErrorCode = ErrorCode.NotFound, Message = "QC lot not found." });
            return Ok(mapper.Map<AdminQCLotDTO>(lot));
        }

        [HttpPost]
        [Authorize(Roles = Roles.Faculty)]
        public async Task<IActionResult> CreateQCLot([FromBody] AddAdminQCLotRequestDTO dto)
        {
            var lotNumber = dto.LotNumber.Trim();
            if (await adminQCLotRepository.LotNumberExistsAsync(lotNumber))
            {
                return Conflict(new RequestErrorObject { ErrorCode = ErrorCode.AlreadyExist, Message = "Lot number already exists." });
            }

            var lot = new AdminQCLot
            {
                AdminQCLotID = Guid.NewGuid(),
                QCName = dto.QCName.Trim(),
                LotNumber = lotNumber,
                OpenDate = dto.OpenDate,
                ClosedDate = dto.ClosedDate,
                ExpirationDate = dto.ExpirationDate,
                IsActive = dto.IsActive,
                FileDate = dto.FileDate ?? DateTime.UtcNow,
                Department = dto.Department,
            };
            foreach (var analyteDto in dto.Analytes)
            {
                var analyte = mapper.Map<Analyte>(analyteDto);
                analyte.AnalyteID = Guid.NewGuid();
                analyte.AdminQCLotID = lot.AdminQCLotID;
                lot.Analytes.Add(analyte);
            }

            await adminQCLotRepository.CreateQCLotAsync(lot);
            var result = mapper.Map<AdminQCLotDTO>(lot);
            return CreatedAtAction(nameof(GetQCLotById), new { id = result.AdminQCLotID }, result);
        }

        [HttpPut("UpdateQCLot/{id:Guid}")]
        [HttpPut("{id:Guid}")]
        [Authorize(Roles = Roles.Faculty)]
        public async Task<IActionResult> UpdateQCLot([FromRoute] Guid id, [FromBody] UpdateAdminQCLotDTO dto)
        {
            var current = await adminQCLotRepository.GetQCLotByIDAsync(id);
            if (current == null) return NotFound(new RequestErrorObject { ErrorCode = ErrorCode.NotFound, Message = "QC lot not found." });

            // Removing an analyte that students already reported on would orphan their results.
            if (current.Reports.Count > 0)
            {
                var keptIds = dto.Analytes.Where(a => a.AnalyteID != null).Select(a => a.AnalyteID!.Value).ToHashSet();
                if (current.Analytes.Any(a => !keptIds.Contains(a.AnalyteID)))
                {
                    return Conflict(new RequestErrorObject { ErrorCode = ErrorCode.InUse, Message = "Analytes cannot be removed from a lot that already has student runs." });
                }
            }

            var updated = new AdminQCLot
            {
                QCName = dto.QCName.Trim(),
                Department = dto.Department,
                OpenDate = dto.OpenDate,
                ClosedDate = dto.IsActive ? null : (dto.ClosedDate ?? DateTime.UtcNow),
                ExpirationDate = dto.ExpirationDate,
                FileDate = dto.FileDate,
                IsActive = dto.IsActive,
                Analytes = dto.Analytes.Select(a =>
                {
                    var analyte = mapper.Map<Analyte>(a);
                    analyte.AnalyteID = a.AnalyteID ?? Guid.Empty;
                    return analyte;
                }).ToList(),
            };

            var saved = await adminQCLotRepository.UpdateQCLotAsync(id, updated);
            if (saved == null) return NotFound(new RequestErrorObject { ErrorCode = ErrorCode.NotFound, Message = "QC lot not found." });

            var reloaded = await adminQCLotRepository.GetQCLotByIDAsync(id);
            return Ok(mapper.Map<AdminQCLotDTO>(reloaded));
        }

        /// <summary>Ported from api_two. Lots with student runs cannot be deleted; deactivate them instead.</summary>
        [HttpDelete("DeleteQCLot/{id:Guid}")]
        [HttpDelete("{id:Guid}")]
        [Authorize(Roles = Roles.Faculty)]
        public async Task<IActionResult> DeleteQCLot([FromRoute] Guid id)
        {
            var lot = await adminQCLotRepository.GetQCLotByIDAsync(id);
            if (lot == null) return NotFound(new RequestErrorObject { ErrorCode = ErrorCode.NotFound, Message = "QC lot not found." });
            if (lot.Reports.Count > 0)
            {
                return Conflict(new RequestErrorObject { ErrorCode = ErrorCode.InUse, Message = "This lot has student runs. Deactivate it instead of deleting it." });
            }
            await adminQCLotRepository.DeleteQCLotAsync(id);
            return NoContent();
        }
    }
}
