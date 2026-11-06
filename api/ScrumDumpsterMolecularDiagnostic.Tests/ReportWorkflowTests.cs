using ScrumDumpsterMolecularDiagnostic.Enums;
using ScrumDumpsterMolecularDiagnostic.Models.Domain;
using ScrumDumpsterMolecularDiagnostic.Models.DTO;
using ScrumDumpsterMolecularDiagnostic.Services;

namespace ScrumDumpsterMolecularDiagnostic.Tests;

/// <summary>Unit tests of the run state machine, with no HTTP or database.</summary>
public class ReportWorkflowTests
{
    private static readonly DateTime Now = new(2026, 11, 5, 12, 0, 0, DateTimeKind.Utc);
    private static readonly Analyte Na = new() { AnalyteID = Guid.NewGuid(), AnalyteName = "Sodium", Mean = 140, StdDevi = 1.5 };
    private static readonly Analyte K = new() { AnalyteID = Guid.NewGuid(), AnalyteName = "Potassium", Mean = 4.2, StdDevi = 0.1 };
    private static readonly Analyte[] Lot = [Na, K];

    private static StudentReport NewRun() => new() { ReportID = Guid.NewGuid(), Status = ReportStatus.InProgress };

    private static SaveResultsRequestDTO Values(params (Analyte a, double v)[] values) =>
        new() { Inputs = values.Select(x => new ResultInputDTO { AnalyteID = x.a.AnalyteID, AnalyteValue = x.v }).ToList() };

    [Fact]
    public void Save_then_submit_then_grade()
    {
        var run = NewRun();
        Assert.Null(ReportWorkflow.SaveResults(run, Lot, Values((Na, 141), (K, 4.3))));
        Assert.Equal(2, run.AnalyteInputs.Count);
        Assert.Equal("Sodium", run.AnalyteInputs.First(i => i.AnalyteID == Na.AnalyteID).AnalyteName);

        Assert.Null(ReportWorkflow.Submit(run, Lot, Now));
        Assert.Equal(ReportStatus.Submitted, run.Status);
        Assert.Equal(Now, run.SubmittedDate);

        var reviewer = Guid.NewGuid();
        Assert.Null(ReportWorkflow.Grade(run, 88, " ok ", reviewer, Now));
        Assert.Equal(ReportStatus.Graded, run.Status);
        Assert.Equal(88, run.Grade);
        Assert.Equal("ok", run.FacultyComment);
        Assert.Equal(reviewer, run.ReviewedByAdminID);
    }

    [Fact]
    public void Saving_twice_updates_existing_values()
    {
        var run = NewRun();
        ReportWorkflow.SaveResults(run, Lot, Values((Na, 141)));
        ReportWorkflow.SaveResults(run, Lot, Values((Na, 139)));
        Assert.Single(run.AnalyteInputs);
        Assert.Equal(139, run.AnalyteInputs.Single().AnalyteValue);
    }

    [Fact]
    public void Submit_requires_every_analyte()
    {
        var run = NewRun();
        ReportWorkflow.SaveResults(run, Lot, Values((Na, 141)));
        var error = ReportWorkflow.Submit(run, Lot, Now);
        Assert.Contains("Potassium", error);
        Assert.Equal(ReportStatus.InProgress, run.Status);
    }

    [Fact]
    public void Rejects_analyte_from_another_lot_and_duplicates()
    {
        var run = NewRun();
        var foreign = new Analyte { AnalyteID = Guid.NewGuid(), AnalyteName = "Glucose" };
        Assert.NotNull(ReportWorkflow.SaveResults(run, Lot, Values((foreign, 90))));
        Assert.NotNull(ReportWorkflow.SaveResults(run, Lot, Values((Na, 140), (Na, 141))));
        Assert.Empty(run.AnalyteInputs);
    }

    [Theory]
    [InlineData(ReportStatus.Submitted)]
    [InlineData(ReportStatus.Graded)]
    public void Results_are_locked_after_submission(ReportStatus status)
    {
        var run = NewRun();
        run.Status = status;
        Assert.NotNull(ReportWorkflow.SaveResults(run, Lot, Values((Na, 141))));
    }

    [Fact]
    public void Grade_must_be_in_range_and_only_for_submitted_runs()
    {
        var run = NewRun();
        Assert.NotNull(ReportWorkflow.Grade(run, 90, null, Guid.NewGuid(), Now)); // not submitted
        run.Status = ReportStatus.Submitted;
        Assert.NotNull(ReportWorkflow.Grade(run, 101, null, Guid.NewGuid(), Now));
        Assert.NotNull(ReportWorkflow.Grade(run, -1, null, Guid.NewGuid(), Now));
        Assert.Null(ReportWorkflow.Grade(run, 100, null, Guid.NewGuid(), Now));
    }

    [Fact]
    public void Returned_run_can_be_edited_and_resubmitted()
    {
        var run = NewRun();
        ReportWorkflow.SaveResults(run, Lot, Values((Na, 141), (K, 4.3)));
        ReportWorkflow.Submit(run, Lot, Now);
        Assert.NotNull(ReportWorkflow.Return(run, "  ", Guid.NewGuid(), Now)); // comment required
        Assert.Null(ReportWorkflow.Return(run, "Recheck K", Guid.NewGuid(), Now));
        Assert.Equal(ReportStatus.Returned, run.Status);
        Assert.Null(ReportWorkflow.SaveResults(run, Lot, Values((K, 4.2))));
        Assert.Null(ReportWorkflow.Submit(run, Lot, Now));
        Assert.Equal(ReportStatus.Submitted, run.Status);
    }
}
