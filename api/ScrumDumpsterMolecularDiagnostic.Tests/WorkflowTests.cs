using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace ScrumDumpsterMolecularDiagnostic.Tests;

/// <summary>End-to-end HTTP tests of the core loop: lot → order → results → submit → grade → gradebook.</summary>
public class WorkflowTests : IClassFixture<MisApiFactory>
{
    private readonly MisApiFactory factory;

    public WorkflowTests(MisApiFactory factory) => this.factory = factory;

    private static async Task<JsonElement> Json(HttpResponseMessage r) => await r.Content.ReadFromJsonAsync<JsonElement>();

    private static object LotBody(string lotNumber, bool active = true) => new
    {
        lotNumber,
        qcName = "Test Lipid Control",
        department = "Chemistry",
        openDate = DateTime.UtcNow.AddDays(-1),
        expirationDate = DateTime.UtcNow.AddDays(90),
        isActive = active,
        analytes = new[]
        {
            new { analyteName = "Cholesterol", analyteAcronym = "CHOL", unitOfMeasure = "mg/dL", minLevel = 180.0, maxLevel = 220.0, mean = 200.0, stdDevi = 10.0 },
            new { analyteName = "Triglycerides", analyteAcronym = "TRIG", unitOfMeasure = "mg/dL", minLevel = 130.0, maxLevel = 170.0, mean = 150.0, stdDevi = 10.0 },
        },
    };

    [Fact]
    public async Task Full_core_loop_persists_from_lot_creation_to_gradebook()
    {
        var faculty = await factory.Faculty();
        var student = await factory.Student();

        // 1. Faculty create a lot with analytes.
        var created = await faculty.PostAsJsonAsync("/api/AdminQCLots", LotBody("LIPID-TEST-0001"));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var lot = await Json(created);
        var lotId = lot.GetProperty("adminQCLotID").GetGuid();
        Assert.Equal(2, lot.GetProperty("analytes").GetArrayLength());

        // 2. Student orders a run on it.
        var ordered = await student.PostAsJsonAsync("/api/Reports", new { adminQCLotID = lotId });
        Assert.Equal(HttpStatusCode.Created, ordered.StatusCode);
        var report = await Json(ordered);
        var reportId = report.GetProperty("reportID").GetGuid();
        Assert.Equal("InProgress", report.GetProperty("status").GetString());

        // Submitting with no results is rejected.
        var early = await student.PostAsync($"/api/Reports/{reportId}/submit", null);
        Assert.Equal(HttpStatusCode.Conflict, early.StatusCode);

        // 3. Student enters results (this is the path that used to throw DbUpdateConcurrencyException).
        var inputs = report.GetProperty("analytes").EnumerateArray()
            .Select(a => new { analyteID = a.GetProperty("analyteID").GetGuid(), analyteValue = a.GetProperty("mean").GetDouble() + 5 })
            .ToArray();
        var saved = await student.PutAsJsonAsync($"/api/Reports/{reportId}/results", new { inputs, studentComment = "Ran after calibration." });
        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);
        Assert.Equal(2, (await Json(saved)).GetProperty("analyteInputs").GetArrayLength());

        // Saving again updates rather than duplicating.
        var resaved = await student.PutAsJsonAsync($"/api/Reports/{reportId}/results", new { inputs });
        Assert.Equal(2, (await Json(resaved)).GetProperty("analyteInputs").GetArrayLength());

        // 4. Student submits; results are then locked.
        var submitted = await student.PostAsync($"/api/Reports/{reportId}/submit", null);
        Assert.Equal("Submitted", (await Json(submitted)).GetProperty("status").GetString());
        var locked = await student.PutAsJsonAsync($"/api/Reports/{reportId}/results", new { inputs });
        Assert.Equal(HttpStatusCode.Conflict, locked.StatusCode);

        // 5. It appears in the faculty review queue and faculty grade it.
        var queue = await Json(await faculty.GetAsync("/api/Reports?status=Submitted"));
        Assert.Contains(queue.EnumerateArray(), r => r.GetProperty("reportID").GetGuid() == reportId);

        var graded = await faculty.PostAsJsonAsync($"/api/Reports/{reportId}/grade", new { grade = 93, facultyComment = "Well documented." });
        Assert.Equal(HttpStatusCode.OK, graded.StatusCode);
        var gradedBody = await Json(graded);
        Assert.Equal("Graded", gradedBody.GetProperty("status").GetString());
        Assert.Equal(93, gradedBody.GetProperty("grade").GetInt32());

        // A graded run cannot be graded again.
        var regrade = await faculty.PostAsJsonAsync($"/api/Reports/{reportId}/grade", new { grade = 10 });
        Assert.Equal(HttpStatusCode.Conflict, regrade.StatusCode);

        // 6. The student's gradebook shows it.
        var gradebook = await Json(await student.GetAsync("/api/Reports?status=Graded"));
        var entry = gradebook.EnumerateArray().Single(r => r.GetProperty("reportID").GetGuid() == reportId);
        Assert.Equal(93, entry.GetProperty("grade").GetInt32());
        Assert.Equal("Well documented.", entry.GetProperty("facultyComment").GetString());

        // Levey-Jennings history includes this run for both analytes.
        var lj = await Json(await student.GetAsync($"/api/Reports/{reportId}/levey-jennings"));
        Assert.All(lj.EnumerateArray(), s => Assert.Equal(1, s.GetProperty("points").GetArrayLength()));
    }

    [Fact]
    public async Task Faculty_can_return_a_run_and_student_can_resubmit()
    {
        var student = await factory.Student("jlee");
        var faculty = await factory.Faculty();
        var submitted = (await Json(await student.GetAsync("/api/Reports?status=Submitted"))).EnumerateArray().First();
        var id = submitted.GetProperty("reportID").GetGuid();

        var noComment = await faculty.PostAsJsonAsync($"/api/Reports/{id}/return", new { facultyComment = "" });
        Assert.Equal(HttpStatusCode.BadRequest, noComment.StatusCode);

        var returned = await faculty.PostAsJsonAsync($"/api/Reports/{id}/return", new { facultyComment = "Recheck glucose." });
        Assert.Equal("Returned", (await Json(returned)).GetProperty("status").GetString());

        var resubmitted = await student.PostAsync($"/api/Reports/{id}/submit", null);
        Assert.Equal("Submitted", (await Json(resubmitted)).GetProperty("status").GetString());
    }

    [Fact]
    public async Task Lot_edit_updates_and_adds_analytes_and_delete_is_blocked_once_used()
    {
        var faculty = await factory.Faculty();
        var lot = await Json(await faculty.PostAsJsonAsync("/api/AdminQCLots", LotBody("LIPID-TEST-0002")));
        var lotId = lot.GetProperty("adminQCLotID").GetGuid();
        var chol = lot.GetProperty("analytes").EnumerateArray().First(a => a.GetProperty("analyteAcronym").GetString() == "CHOL");
        var trig = lot.GetProperty("analytes").EnumerateArray().First(a => a.GetProperty("analyteAcronym").GetString() == "TRIG");

        var update = new
        {
            qcName = "Test Lipid Control (edited)",
            department = "Chemistry",
            openDate = DateTime.UtcNow.AddDays(-1),
            expirationDate = DateTime.UtcNow.AddDays(60),
            isActive = true,
            analytes = new object[]
            {
                new { analyteID = chol.GetProperty("analyteID").GetGuid(), analyteName = "Cholesterol", analyteAcronym = "CHOL", unitOfMeasure = "mg/dL", minLevel = 176.0, maxLevel = 224.0, mean = 200.0, stdDevi = 12.0 },
                new { analyteID = trig.GetProperty("analyteID").GetGuid(), analyteName = "Triglycerides", analyteAcronym = "TRIG", unitOfMeasure = "mg/dL", minLevel = 130.0, maxLevel = 170.0, mean = 150.0, stdDevi = 10.0 },
                new { analyteName = "HDL Cholesterol", analyteAcronym = "HDL", unitOfMeasure = "mg/dL", minLevel = 40.0, maxLevel = 60.0, mean = 50.0, stdDevi = 5.0 },
            },
        };
        var updated = await Json(await faculty.PutAsJsonAsync($"/api/AdminQCLots/{lotId}", update));
        Assert.Equal("Test Lipid Control (edited)", updated.GetProperty("qcName").GetString());
        Assert.Equal(3, updated.GetProperty("analytes").GetArrayLength());
        Assert.Equal(12.0, updated.GetProperty("analytes").EnumerateArray().First(a => a.GetProperty("analyteAcronym").GetString() == "CHOL").GetProperty("stdDevi").GetDouble());

        // Once a student has a run on the lot it cannot be deleted.
        var student = await factory.Student("spatel");
        Assert.Equal(HttpStatusCode.Created, (await student.PostAsJsonAsync("/api/Reports", new { adminQCLotID = lotId })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await faculty.DeleteAsync($"/api/AdminQCLots/{lotId}")).StatusCode);
    }

    [Fact]
    public async Task Invalid_lot_is_rejected_with_validation_errors()
    {
        var faculty = await factory.Faculty();
        var bad = new
        {
            lotNumber = "SHORT", qcName = "X", department = "Chemistry",
            openDate = DateTime.UtcNow, expirationDate = DateTime.UtcNow.AddDays(-1), analytes = Array.Empty<object>(),
        };
        var response = await faculty.PostAsJsonAsync("/api/AdminQCLots", bad);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var duplicate = await faculty.PostAsJsonAsync("/api/AdminQCLots", LotBody("BMP1-260901"));
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);
    }

    [Fact]
    public async Task Inactive_lot_cannot_be_ordered()
    {
        var faculty = await factory.Faculty();
        var lot = await Json(await faculty.PostAsJsonAsync("/api/AdminQCLots", LotBody("LIPID-INACTIVE-1", active: false)));
        var student = await factory.Student();
        var response = await student.PostAsJsonAsync("/api/Reports", new { adminQCLotID = lot.GetProperty("adminQCLotID").GetGuid() });
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }
}
