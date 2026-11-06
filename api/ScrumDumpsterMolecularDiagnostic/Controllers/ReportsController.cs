using AutoMapper;
using ScrumDumpsterMolecularDiagnostic.Auth;
using ScrumDumpsterMolecularDiagnostic.Enums;
using ScrumDumpsterMolecularDiagnostic.Models.Domain;
using ScrumDumpsterMolecularDiagnostic.Models.DTO;
using ScrumDumpsterMolecularDiagnostic.Models.ErrorHandling;
using ScrumDumpsterMolecularDiagnostic.Repositories.Interfaces;
using ScrumDumpsterMolecularDiagnostic.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ScrumDumpsterMolecularDiagnostic.Controllers
{
    /// <summary>
    /// Student QC runs ("reports"): order → enter results → submit → faculty grade or return → gradebook.
    /// Students can only see and change their own runs; faculty can see all runs and review them.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ReportsController : ControllerBase
    {
        private readonly IStudentReportRepository reports;
        private readonly IAdminQCLotRepository lots;
        private readonly IStudentRepository students;
        private readonly IMapper mapper;
        private readonly TimeProvider clock;

        public ReportsController(IStudentReportRepository reports, IAdminQCLotRepository lots, IStudentRepository students, IMapper mapper, TimeProvider clock)
        {
            this.reports = reports;
            this.lots = lots;
            this.students = students;
            this.mapper = mapper;
            this.clock = clock;
        }

        private DateTime Now => clock.GetUtcNow().UtcDateTime;

        /// <summary>Faculty: every run (optionally filtered). Student: their own runs.</summary>
        [HttpGet]
        public async Task<IActionResult> List([FromQuery] ReportStatus? status, [FromQuery] Guid? studentId)
        {
            List<StudentReport> result;
            if (User.IsFaculty())
            {
                result = studentId != null
                    ? await reports.GetForStudentAsync(studentId.Value, status)
                    : await reports.GetAllAsync(status);
            }
            else
            {
                var me = User.GetProfileId();
                if (me == null) return Forbid();
                result = await reports.GetForStudentAsync(me.Value, status);
            }
            return Ok(mapper.Map<List<StudentReportDTO>>(result));
        }

        [HttpGet("{id:Guid}")]
        public async Task<IActionResult> Get([FromRoute] Guid id)
        {
            var (report, error) = await LoadForViewer(id);
            if (error != null) return error;
            return Ok(mapper.Map<StudentReportDTO>(report));
        }

        /// <summary>Student orders a QC run on an active, unexpired lot.</summary>
        [HttpPost]
        [Authorize(Roles = Roles.Student)]
        public async Task<IActionResult> Create([FromBody] CreateReportRequestDTO dto)
        {
            var me = User.GetProfileId();
            if (me == null || await students.GetStudentByIDAsync(me.Value) == null) return Forbid();

            var lot = await lots.GetQCLotByIDAsync(dto.AdminQCLotID);
            if (lot == null) return NotFound(new RequestErrorObject { ErrorCode = ErrorCode.NotFound, Message = "QC lot not found." });
            if (!lot.IsActive) return StateConflict("This QC lot is not active.");
            if (lot.ExpirationDate.Date < Now.Date) return StateConflict($"This QC lot expired on {lot.ExpirationDate:yyyy-MM-dd}.");

            var report = new StudentReport
            {
                ReportID = Guid.NewGuid(),
                StudentID = me.Value,
                AdminQCLotID = lot.AdminQCLotID,
                Status = ReportStatus.InProgress,
                CreatedDate = Now,
                RunDate = Now,
            };
            await reports.CreateAsync(report);

            var created = await reports.GetByIdAsync(report.ReportID);
            return CreatedAtAction(nameof(Get), new { id = report.ReportID }, mapper.Map<StudentReportDTO>(created));
        }

        /// <summary>Student saves (upserts) result values and an optional comment. Allowed while In Progress or Returned.</summary>
        [HttpPut("{id:Guid}/results")]
        [Authorize(Roles = Roles.Student)]
        public async Task<IActionResult> SaveResults([FromRoute] Guid id, [FromBody] SaveResultsRequestDTO dto)
        {
            var (report, error) = await LoadForOwner(id);
            if (error != null) return error;

            var failure = ReportWorkflow.SaveResults(report!, report!.AdminQCLot!.Analytes.ToList(), dto);
            if (failure != null) return StateConflict(failure);

            await reports.SaveChangesAsync();
            return Ok(mapper.Map<StudentReportDTO>(report));
        }

        [HttpPost("{id:Guid}/submit")]
        [Authorize(Roles = Roles.Student)]
        public async Task<IActionResult> Submit([FromRoute] Guid id)
        {
            var (report, error) = await LoadForOwner(id);
            if (error != null) return error;

            var failure = ReportWorkflow.Submit(report!, report!.AdminQCLot!.Analytes.ToList(), Now);
            if (failure != null) return StateConflict(failure);

            await reports.SaveChangesAsync();
            return Ok(mapper.Map<StudentReportDTO>(report));
        }

        /// <summary>Student discards a run they have not submitted yet.</summary>
        [HttpDelete("{id:Guid}")]
        [Authorize(Roles = Roles.Student)]
        public async Task<IActionResult> Discard([FromRoute] Guid id, [FromServices] Data.MedicalInformationDbContext db)
        {
            var (report, error) = await LoadForOwner(id);
            if (error != null) return error;
            if (report!.Status != ReportStatus.InProgress) return StateConflict("Only runs that are still In Progress can be discarded.");

            db.StudentReports.Remove(report);
            await reports.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("{id:Guid}/grade")]
        [Authorize(Roles = Roles.Faculty)]
        public async Task<IActionResult> Grade([FromRoute] Guid id, [FromBody] GradeReportRequestDTO dto)
        {
            var report = await reports.GetByIdAsync(id);
            if (report == null) return NotFound();

            var failure = ReportWorkflow.Grade(report, dto.Grade, dto.FacultyComment, User.GetProfileId() ?? Guid.Empty, Now);
            if (failure != null) return StateConflict(failure);

            await reports.SaveChangesAsync();
            return Ok(mapper.Map<StudentReportDTO>(report));
        }

        [HttpPost("{id:Guid}/return")]
        [Authorize(Roles = Roles.Faculty)]
        public async Task<IActionResult> Return([FromRoute] Guid id, [FromBody] ReturnReportRequestDTO dto)
        {
            var report = await reports.GetByIdAsync(id);
            if (report == null) return NotFound();

            var failure = ReportWorkflow.Return(report, dto.FacultyComment, User.GetProfileId() ?? Guid.Empty, Now);
            if (failure != null) return StateConflict(failure);

            await reports.SaveChangesAsync();
            return Ok(mapper.Map<StudentReportDTO>(report));
        }

        /// <summary>
        /// Levey-Jennings data for every analyte on this run's lot: the same student's results on that lot in run-date
        /// order (submitted, returned and graded runs, plus this run if it has values). Westgard rules are evaluated
        /// on the client from these points so the browser-only demo mode uses the same logic.
        /// </summary>
        [HttpGet("{id:Guid}/levey-jennings")]
        public async Task<IActionResult> LeveyJennings([FromRoute] Guid id)
        {
            var (report, error) = await LoadForViewer(id);
            if (error != null) return error;

            var history = await reports.GetHistoryAsync(report!.StudentID, report.AdminQCLotID);
            if (history.All(h => h.ReportID != report.ReportID)) history.Add(report);
            history = history.OrderBy(h => h.RunDate).ToList();

            var series = report.AdminQCLot!.Analytes
                .OrderBy(a => a.AnalyteName)
                .Select(a => new LeveyJenningsSeriesDTO
                {
                    Analyte = mapper.Map<AnalyteDTO>(a),
                    Points = history
                        .SelectMany(h => h.AnalyteInputs.Where(i => i.AnalyteID == a.AnalyteID)
                            .Select(i => new LeveyJenningsPointDTO { ReportID = h.ReportID, RunDate = h.RunDate, Value = i.AnalyteValue, Status = h.Status }))
                        .ToList(),
                })
                .ToList();

            return Ok(series);
        }

        private ObjectResult StateConflict(string message) =>
            new(new ProblemDetails { Title = message, Status = StatusCodes.Status409Conflict }) { StatusCode = StatusCodes.Status409Conflict };

        /// <summary>Faculty can view any run; students only their own. Returns 404 (not 403) for other students' runs
        /// so ids cannot be probed.</summary>
        private async Task<(StudentReport?, IActionResult?)> LoadForViewer(Guid id)
        {
            var report = await reports.GetByIdAsync(id);
            if (report == null) return (null, NotFound());
            if (!User.IsFaculty() && report.StudentID != User.GetProfileId()) return (null, NotFound());
            return (report, null);
        }

        private async Task<(StudentReport?, IActionResult?)> LoadForOwner(Guid id)
        {
            var report = await reports.GetByIdAsync(id);
            if (report == null || report.StudentID != User.GetProfileId()) return (null, NotFound());
            return (report, null);
        }
    }
}
